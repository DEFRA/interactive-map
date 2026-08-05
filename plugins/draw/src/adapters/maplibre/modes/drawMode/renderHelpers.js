/**
 * Rendering helpers for the shared draw mode: crosshair/vertex-marker visibility,
 * interface switching, simulated mouse events at map centre, and the display-feature
 * pass that adds a marker on every placed vertex. Part of createDrawMode.
 */
export const createRenderHelpers = ({ ParentMode, geometryType, getFeature, getPlacedCoords }) => ({
  _simulateMouse (type, fn, state) {
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

  _showCrossHair (state) {
    if (state.crossHair) { state.crossHair.show() } else { state.vertexMarker.style.display = 'block' }
  },

  _hideCrossHair (state) {
    if (state.crossHair) { state.crossHair.hide() } else { state.vertexMarker.style.display = 'none' }
  },

  _setInterface (state, type, show = true) {
    state.interfaceType = type
    if (show) {
      this._showCrossHair(state)
    }
  },

  toDisplayFeatures (state, geojson, display) {
    ParentMode.toDisplayFeatures.call(this, state, geojson, display)

    // Display features carry the id in properties.id (no top-level id)
    const feature = getFeature(state)
    if (geojson.geometry.type === geometryType && geojson.properties.id === feature.id) {
      // Parent modes render only some placed vertices (which ones varies by
      // mapbox-gl-draw version) — add a marker on every placed vertex. The
      // 'draw-vertex' meta is display-only: it's not in mapbox-gl-draw's
      // META_TYPES, so featuresAt ignores these markers and the parent's own
      // vertex click targets (click first/last to finish) keep working.
      getPlacedCoords(geojson).forEach((coordinates) => display({
        type: 'Feature',
        properties: { meta: 'draw-vertex', parent: feature.id, active: 'false' },
        geometry: { type: 'Point', coordinates }
      }))
    }
  }
})
