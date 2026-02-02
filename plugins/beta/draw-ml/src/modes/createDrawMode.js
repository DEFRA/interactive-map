import createVertex from '../../../../../node_modules/@mapbox/mapbox-gl-draw/src/lib/create_vertex.js'
import { isValidClick, isValidLineClick } from '../utils.js'
import {
  getSnapInstance,
  isSnapActive,
  isSnapEnabled,
  getSnapLngLat,
  triggerSnapAtPoint,
  triggerSnapAtCenter,
  createSnappedEvent,
  createSnappedClickEvent
} from '../snapHelpers.js'

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
        vertexButtonClickHandler: this.onVertexButtonClick
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
        [map, 'move', this.moveHandler]
      ]
      this._listeners.forEach(([t, e, h]) => t.addEventListener ? t.addEventListener(e, h) : t.on(e, h))

      return state
    },

    onClick(state, e) {
      if (e.originalEvent.button > 0) {
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
      ParentMode.onClick.call(this, state, e)
    },

    onTap() {
      return
    },

    doClick(state) {
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

      if (snappedEvent) {
        ParentMode.onClick.call(this, state, snappedEvent)
        this._ctx.store.render()
      } else {
        this._simulateMouse('click', ParentMode.onClick, state)
      }
    },

    dispatchVertexChange(coords) {
      this.map.fire('draw.vertexchange', {
        numVertecies: coords.length
      })
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
      draw.add(feature)
    },

    onVertexButtonClick(state, e) {
      if (e.target.closest(`#${state.addVertexButtonId}`)) {
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
      if (e.key === 'Escape') {
        return
      }
      this._setInterface(state, 'keyboard')
      this.onMove(state, e)
      if (e.key === 'Enter' && state.isActive) {
        this.doClick(state)
      }
    },

    onFocus(state) {
      const { vertexMarker, interfaceType } = state
      vertexMarker.style.display = ['touch', 'keyboard'].includes(interfaceType) ? 'block' : 'none'
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
