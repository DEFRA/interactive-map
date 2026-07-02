const CURSOR_LAYER_ID = 'draw-mouse-cursor'
const CURSOR_SOURCE_ID = 'draw-mouse-cursor-source'

export const createMouseCursorIndicator = (map) => {
  let isActive = false

  const addLayer = () => {
    if (map.getLayer(CURSOR_LAYER_ID)) {
      return
    }

    if (!map.getSource(CURSOR_SOURCE_ID)) {
      map.addSource(CURSOR_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })
    }

    map.addLayer({
      id: CURSOR_LAYER_ID,
      type: 'circle',
      source: CURSOR_SOURCE_ID,
      paint: {
        'circle-radius': 3,
        'circle-color': '#1a65a6',
        'circle-opacity': 0.8
      }
    })
  }

  const removeLayer = () => {
    if (map.getLayer(CURSOR_LAYER_ID)) {
      map.removeLayer(CURSOR_LAYER_ID)
    }
    if (map.getSource(CURSOR_SOURCE_ID)) {
      map.removeSource(CURSOR_SOURCE_ID)
    }
  }

  const updateCursor = (lngLat) => {
    const source = map.getSource(CURSOR_SOURCE_ID)
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat] }
        }]
      })
    }
  }

  return {
    activate () {
      if (isActive) {
        return
      }
      isActive = true
      addLayer()
    },

    deactivate () {
      if (!isActive) {
        return
      }
      isActive = false
      removeLayer()
    },

    updateFromEvent (e) {
      if (isActive) {
        updateCursor(e.lngLat)
      }
    }
  }
}
