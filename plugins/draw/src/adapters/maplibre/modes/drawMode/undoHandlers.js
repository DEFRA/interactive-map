/**
 * Undo handling for the shared draw mode: pushing draw_vertex operations, undoing the
 * last placed vertex, reinitialising a feature, and the rubber-band update that follows.
 * Part of createDrawMode.
 */
export const createUndoHandlers = ({ ParentMode, featureProp, geometryType, getCoords, getFeature, RUBBER_BAND_OFFSET }) => ({
  /**
   * Push an undo operation for the last added vertex
   */
  pushDrawUndo (state) {
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
  undoVertex (state) {
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
  _reinitializeFeature (state, feature) {
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
        crossHair: state.crossHair,
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
  _removeLastVertex (state, feature, coords) {
    // Structure during drawing: [v1, v2, ..., vN, rubber_band]
    const ring = geometryType === 'Polygon' ? feature.coordinates[0] : coords
    ring.splice(-RUBBER_BAND_OFFSET, 1)

    // Snap rubber band to new last vertex position. undoVertex only calls here with
    // 3+ coords, so after the splice the ring always has a preceding vertex.
    ring[ring.length - 1] = [...ring[ring.length - 2]]

    // Keep parent mode's vertex counter in sync (min 1 for rubber band)
    state.currentVertexPosition = Math.max(1, state.currentVertexPosition - 1)

    this._ctx.store.render()
    this._updateRubberBand(state, getCoords(feature))
  },

  /**
   * Update rubber band position based on interface type
   */
  _updateRubberBand (state, coords) {
    if (['touch', 'keyboard'].includes(state.interfaceType)) {
      // Touch/keyboard: move to map center for add point to work
      this._simulateMouse('mousemove', ParentMode.onMouseMove, state)
      this._ctx.store.render()
    } else {
      // Mouse: keep rubber band at current position. After a vertex removal the
      // rubber band index always resolves to a real coordinate.
      const rubberBandIndex = geometryType === 'Polygon' ? coords.length - 2 : coords.length - 1
      const rubberBandPos = coords[rubberBandIndex]
      const lngLat = { lng: rubberBandPos[0], lat: rubberBandPos[1] }
      const point = this.map.project(lngLat)
      ParentMode.onMouseMove.call(this, state, {
        lngLat,
        point,
        originalEvent: new MouseEvent('mousemove', { clientX: point.x, clientY: point.y })
      })
      this._ctx.store.render()
    }
    this.dispatchVertexChange(coords)
  },

  /**
   * Handle draw.undo event
   */
  onUndo (state, e) {
    if (e.operation?.type === 'draw_vertex') {
      this.undoVertex(state)
    }
  },

  _handleUndoKeydown (state, e) {
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
  }
})
