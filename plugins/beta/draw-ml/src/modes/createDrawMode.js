import createVertex from '../../../../../node_modules/@mapbox/mapbox-gl-draw/src/lib/create_vertex.js'

import {
  getSnapInstance,
  isSnapActive,
  isSnapEnabled,
  getSnapLngLat,
  triggerSnapAtPoint,
  triggerSnapAtCenter,
  createSnappedEvent,
  createSnappedClickEvent
} from '../utils/snapHelpers.js'

/**
 * Factory function to create a draw mode for either polygons or lines.
 * Reduces duplication by sharing common event handling, snap detection, etc.
 *
 * @param {Object} ParentMode - DrawPolygon or DrawLineString from mapbox-gl-draw
 * @param {Object} config - Configuration for the mode
 * @param {string} config.featureProp - Property name on state ('polygon' or 'line')
 * @param {string} config.geometryType - 'Polygon' or 'LineString'
 * @param {Function} config.getCoords - Function to get coordinates from feature
 * @param {Function} config.validateClick - Validation function for clicks
 * @param {Function} config.createVertices - Function to create vertex display features
 */
export const createDrawMode = (ParentMode, config) => {
  const {
    featureProp,
    geometryType,
    getCoords,
    validateClick,
    createVertices,
    excludeFeatureIdFromSetup = false,
    finishOnInvalidClick = false // For lines: finish when clicking same spot (like double-click)
  } = config

  const getFeature = (state) => state[featureProp]

  return {
    ...ParentMode,

    onSetup(options) {
      const { map } = this

      // Some parent modes (DrawLineString) interpret featureId as "continue existing"
      // rather than "use this ID for new feature"
      const parentOptions = excludeFeatureIdFromSetup
        ? { ...options, featureId: undefined }
        : options

      const state = {
        ...ParentMode.onSetup.call(this, parentOptions),
        ...options
      }

      // Add initial props
      state[featureProp].properties = options.properties

      const { container, interfaceType, vertexMarkerId } = state
      const vertexMarker = container.querySelector(`#${vertexMarkerId}`)
      vertexMarker.style.display = ['touch', 'keyboard'].includes(interfaceType) ? 'block' : 'none'
      state.vertexMarker = vertexMarker

      // Bind all handlers once
      const bind = (name, fn) => (this[name] = fn.bind(this, state))
      const handlers = {
        keydownHandler: this.onKeydown,
        keyupHandler: this.onKeyup,
        focusHandler: this.onFocus,
        blurHandler: this.onBlur,
        createHandler: this.onCreate,
        moveHandler: this.onMove,
        pointerdownHandler: this.onPointerdown,
        pointermoveHandler: this.onPointermove,
        pointerupHandler: this.onPointerup,
        vertexButtonClickHandler: this.onVertexButtonClick,
        undoHandler: this.onUndo
      }
      Object.entries(handlers).forEach(([k, fn]) => bind(k, fn))

      // Register events
      this._listeners = [
        [window, 'keydown', this.keydownHandler],
        [window, 'keyup', this.keyupHandler],
        [window, 'click', this.vertexButtonClickHandler],
        [container, 'focus', this.focusHandler],
        [container, 'blur', this.blurHandler],
        [container, 'pointermove', this.pointermoveHandler],
        [container, 'pointerup', this.pointerupHandler],
        [map, 'pointerdown', this.pointerdownHandler],
        [map, 'draw.create', this.createHandler],
        [map, 'move', this.moveHandler],
        [map, 'draw.undo', this.undoHandler]
      ]
      this._listeners.forEach(([t, e, h]) => t.addEventListener ? t.addEventListener(e, h) : t.on(e, h))

      return state
    },

    onClick(state, e) {
      // Skip non-primary clicks, undo operations, or clicks outside canvas
      if (e.originalEvent.button > 0 || this.map._undoInProgress || e.originalEvent.target !== this.map.getCanvas()) {
        return
      }
      const snap = getSnapInstance(this.map)
      if (isSnapEnabled(state) && isSnapActive(snap)) {
        e = createSnappedEvent(e, snap)
      } else {
        const coords = getCoords(getFeature(state))
        if (coords.length > 0) {
          coords[coords.length - 1] = [e.lngLat.lng, e.lngLat.lat]
        }
      }
      const coordsBefore = getCoords(getFeature(state)).length
      ParentMode.onClick.call(this, state, e)
      // Push undo if a vertex was added
      if (getCoords(getFeature(state)).length > coordsBefore) {
        this.pushDrawUndo(state)
      }
    },

    onTap() {
      return
    },

    doClick(state) {
      // Skip during undo operation
      if (this.map._undoInProgress) {
        return
      }

      const feature = getFeature(state)
      const coords = getCoords(feature)
      this.dispatchVertexChange(coords)

      if (!validateClick(feature)) {
        // For lines: clicking same spot (like double-click) should finish the line
        if (finishOnInvalidClick && coords.length > 1) {
          coords.pop()
          this.map.fire('draw.create', {
            features: [feature.toGeoJSON()]
          })
          this.changeMode('simple_select', { featureIds: [feature.id] })
        }
        return
      }

      const snap = getSnapInstance(this.map)
      const snappedEvent = isSnapEnabled(state) && createSnappedClickEvent(this.map, snap)
      const coordsBefore = coords.length

      if (snappedEvent) {
        ParentMode.onClick.call(this, state, snappedEvent)
        this._ctx.store.render()
      } else {
        this._simulateMouse('click', ParentMode.onClick, state)
      }

      // Push undo if a vertex was added
      if (getCoords(getFeature(state)).length > coordsBefore) {
        this.pushDrawUndo(state)
      }
    },

    dispatchVertexChange(coords) {
      this.map.fire('draw.vertexchange', {
        numVertecies: coords.length
      })
    },

    /**
     * Push an undo operation for the last added vertex
     */
    pushDrawUndo(state) {
      const undoStack = this.map._undoStack
      // Don't push during undo operations
      if (!undoStack || this.map._undoInProgress) {
        return
      }
      undoStack.push({
        type: 'draw_vertex',
        geometryType,
        featureId: getFeature(state).id
      })
    },

    /**
     * Undo the last added vertex during drawing
     */
    undoVertex(state) {
      const feature = getFeature(state)
      const coords = getCoords(feature)

      if (coords.length < 2) {
        return false
      }

      // Undoing last vertex requires reinitializing the feature
      if (coords.length === 2) {
        return this._reinitializeFeature(state, feature)
      }

      this._removeLastVertex(state, feature, coords)
      return true
    },

    /**
     * Reinitialize feature when undoing to 0 vertices
     * For Polygon: reinitialize in place
     * For LineString: restart the draw mode with fresh state
     */
    _reinitializeFeature(state, feature) {
      const featureId = feature.id
      this._ctx.store.delete([featureId])

      // LineString: restart the draw mode with fresh state but same feature ID
      if (geometryType === 'LineString') {
        const undoStack = this.map._undoStack
        if (undoStack) {
          undoStack.clear()
        }
        // Restart draw with same options (excludeFeatureIdFromSetup prevents "continue" mode)
        this._ctx.api.changeMode('draw_line', {
          featureId,
          container: state.container,
          interfaceType: state.interfaceType,
          vertexMarkerId: state.vertexMarkerId,
          addVertexButtonId: state.addVertexButtonId,
          getSnapEnabled: state.getSnapEnabled,
          properties: state.properties
        })
        return true
      }

      // Polygon: reinitialize in place
      const center = this.map.getCenter()
      const initialCoords = [[center.lng, center.lat], [center.lng, center.lat]]
      const newFeature = this.newFeature({
        type: 'Feature',
        properties: state.properties || {},
        geometry: {
          type: geometryType,
          coordinates: [initialCoords]
        }
      })
      newFeature.id = featureId
      this._ctx.store.add(newFeature)

      state[featureProp] = newFeature
      state.currentVertexPosition = 0

      this._ctx.store.render()
      this._simulateMouse('mousemove', ParentMode.onMouseMove, state)
      this._ctx.store.render()

      this.dispatchVertexChange(initialCoords)
      return true
    },

    /**
     * Remove the last committed vertex and update rubber band
     */
    _removeLastVertex(state, feature, coords) {
      // Structure during drawing: [v1, v2, ..., vN, rubber_band]
      const ring = geometryType === 'Polygon' ? feature.coordinates[0] : coords
      ring.splice(ring.length - 2, 1)

      // Snap rubber band to new last vertex position
      const newLastVertex = ring[ring.length - 2]
      if (newLastVertex) {
        ring[ring.length - 1] = [...newLastVertex]
      }

      // Keep parent mode's vertex counter in sync (min 1 for rubber band)
      state.currentVertexPosition = Math.max(1, state.currentVertexPosition - 1)

      this._ctx.store.render()
      this._updateRubberBand(state, getCoords(feature))
    },

    /**
     * Update rubber band position based on interface type
     */
    _updateRubberBand(state, coords) {
      if (['touch', 'keyboard'].includes(state.interfaceType)) {
        // Touch/keyboard: move to map center for add point to work
        this._simulateMouse('mousemove', ParentMode.onMouseMove, state)
        this._ctx.store.render()
      } else {
        // Mouse: keep rubber band at current position
        const rubberBandIndex = geometryType === 'Polygon' ? coords.length - 2 : coords.length - 1
        const rubberBandPos = coords[rubberBandIndex]
        if (rubberBandPos) {
          const lngLat = { lng: rubberBandPos[0], lat: rubberBandPos[1] }
          const point = this.map.project(lngLat)
          ParentMode.onMouseMove.call(this, state, {
            lngLat,
            point,
            originalEvent: new MouseEvent('mousemove', { clientX: point.x, clientY: point.y })
          })
          this._ctx.store.render()
        }
      }
      this.dispatchVertexChange(coords)
    },

    /**
     * Handle draw.undo event
     */
    onUndo(state, e) {
      if (e.operation?.type === 'draw_vertex') {
        this.undoVertex(state)
      }
    },

    _simulateMouse(type, fn, state) {
      const { map } = this
      const center = map.getCenter()
      const point = map.project(center)
      fn.call(this, state, {
        lngLat: center,
        point,
        originalEvent: new MouseEvent(type, {
          clientX: point.x,
          clientY: point.y,
          bubbles: true,
          cancelable: true
        })
      })
      this._ctx.store.render()

      this.map.fire('draw.geometrychange', state.polygon || state.line)
    },

    _setInterface(state, type, show = true) {
      state.interfaceType = type
      if (show) {
        state.vertexMarker.style.display = 'block'
      }
    },

    onCreate(state, e) {
      const draw = this._ctx.api
      const feature = e.features[0]
      draw.delete(feature.id)
      feature.id = state.featureId
      draw.add(feature, { userProperties: true })
    },

    onVertexButtonClick(state, e) {
      // Only trigger for the specific add vertex button, and skip during undo
      if (state.addVertexButtonId && !this.map._undoInProgress && e.target.closest(`#${state.addVertexButtonId}`)) {
        this.doClick(state)
      }
    },

    onTouchStart(state, e) {
      this._setInterface(state, 'touch')
      this.onMove(state, e)
    },

    onTouchEnd(state, e) {
      this._setInterface(state, 'touch')
      this.onMove(state, e)
    },

    onKeydown(state, e) {
      // Undo with Cmd/Ctrl+Z (works without viewport focus, but not in input fields)
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') {
          return
        }
        e.preventDefault()
        e.stopPropagation()
        const undoStack = this.map._undoStack
        if (undoStack && undoStack.length > 0) {
          const operation = undoStack.pop()
          if (operation?.type === 'draw_vertex') {
            // Set flag to prevent click interference during undo
            this.map._undoInProgress = true
            setTimeout(() => { this.map._undoInProgress = false }, 100)
            this.undoVertex(state)
          }
        }
        return
      }
      if (document.activeElement !== state.container) {
        return
      }
      if (e.key === 'Escape') {
        return e.preventDefault()
      }
      if (e.key === 'Enter') {
        state.isActive = true
      }
      this._setInterface(state, 'keyboard')
      this.onMove(state, e)
    },

    onKeyup(state, e) {
      if (e.key === 'Escape' || document.activeElement !== state.container) {
        return
      }
      this._setInterface(state, 'keyboard')
      this.onMove(state, e)
      if (e.key === 'Enter' && state.isActive) {
        this.doClick(state)
      }
    },

    onFocus(state) {
      state.vertexMarker.style.display = ['touch', 'keyboard'].includes(state.interfaceType) ? 'block' : 'none'
    },

    onBlur(state, e) {
      if (e.target !== state.container) {
        state.vertexMarker.style.display = 'none'
      }
    },

    onMouseMove(state, e) {
      if (isSnapEnabled(state)) {
        const snap = getSnapInstance(this.map)
        triggerSnapAtPoint(snap, this.map, e.point)

        const snappedLngLat = getSnapLngLat(snap)
        if (snappedLngLat) {
          e = { ...e, lngLat: snappedLngLat }
        }
      }

      this.map.fire('draw.geometrychange', state.polygon || state.line)
      
      ParentMode.onMouseMove.call(this, state, e)
    },

    onMove(state) {
      if (['touch', 'keyboard'].includes(state.interfaceType)) {
        if (isSnapEnabled(state)) {
          triggerSnapAtCenter(getSnapInstance(this.map), this.map)
        }

        const snap = getSnapInstance(this.map)
        const snappedLngLat = isSnapEnabled(state) && getSnapLngLat(snap)

        if (snappedLngLat) {
          const point = this.map.project([snappedLngLat.lng, snappedLngLat.lat])
          ParentMode.onMouseMove.call(this, state, {
            lngLat: snappedLngLat,
            point,
            originalEvent: new MouseEvent('mousemove', {
              clientX: point.x,
              clientY: point.y,
              bubbles: true,
              cancelable: true
            })
          })
          this._ctx.store.render()
        } else {
          this._simulateMouse('mousemove', ParentMode.onMouseMove, state)
        }
      }
    },

    onPointerdown(state, e) {
      if (e.pointerType !== 'touch') {
        this._setInterface(state, 'pointer', false)
      }
    },

    onPointermove(state, e) {
      if (e.pointerType !== 'touch') {
        state.vertexMarker.style.display = 'none'
      }
    },

    onPointerup(state) {
      this.dispatchVertexChange(getCoords(getFeature(state)))
    },

    toDisplayFeatures(state, geojson, display) {
      ParentMode.toDisplayFeatures.call(this, state, geojson, display)

      const feature = getFeature(state)
      if (geojson.geometry.type === geometryType && geojson.id === feature.id) {
        createVertices(geojson, display, createVertex)
      }
    },

    onStop(state) {
      ParentMode.onStop.call(this, state)
      this._listeners.forEach(([t, e, h]) => t.removeEventListener ? t.removeEventListener(e, h) : t.off(e, h))
      state.vertexMarker.style.display = 'none'
    }
  }
}
