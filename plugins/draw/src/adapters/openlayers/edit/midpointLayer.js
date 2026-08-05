import VectorSource from 'ol/source/Vector.js'
import VectorLayer from 'ol/layer/Vector.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import { getMidpoints } from '../utils/geometryHelpers.js'

/**
 * Manages a dedicated overlay layer for midpoint handles in edit mode.
 * Midpoints are always visible (unlike OL Modify's native midpoints which
 * only appear when the pointer is near a segment). The selected midpoint is
 * rendered by the separate active-selection layer in EditMode (zIndex 103).
 */
export const createMidpointLayer = (map, midpointStyle) => {
  let currentStyle = midpointStyle
  let selectedIndex = -1
  const source = new VectorSource()
  const layer = new VectorLayer({
    source,
    style: (feature) => feature.get('midpointIndex') === selectedIndex ? null : [currentStyle],
    zIndex: 101
  })
  map.addLayer(layer)

  return {
    update (geom) {
      source.clear()
      const midpoints = getMidpoints(geom)
      const features = midpoints.map((coord, i) => {
        const f = new Feature({ geometry: new Point(coord) })
        f.set('midpointIndex', i)
        return f
      })
      source.addFeatures(features)
    },

    setSelected (index) {
      selectedIndex = index
      source.changed()
    },

    updateStyle (newMidpointStyle) {
      currentStyle = newMidpointStyle
      source.changed()
    },

    getCoords () {
      return source.getFeatures()
        .sort((a, b) => a.get('midpointIndex') - b.get('midpointIndex'))
        .map(f => f.getGeometry().getCoordinates())
    },

    remove () {
      source.clear()
      map.removeLayer(layer)
    }
  }
}
