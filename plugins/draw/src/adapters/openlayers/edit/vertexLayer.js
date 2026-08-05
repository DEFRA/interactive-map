import VectorSource from 'ol/source/Vector.js'
import VectorLayer from 'ol/layer/Vector.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import { getCoords } from '../utils/geometryHelpers.js'

/**
 * Always-visible vertex handle layer for edit mode.
 * OL Modify's built-in vertex handles only appear on hover; this layer
 * keeps circles visible at all times. The selected vertex is rendered by
 * the separate active-selection layer in EditMode (zIndex 103).
 */
export const createVertexLayer = (map, vertexStyle) => {
  let currentStyle = vertexStyle
  let selectedIndex = -1
  const source = new VectorSource()
  const layer = new VectorLayer({
    source,
    style: (feature) => feature.get('vertexIndex') === selectedIndex ? null : [currentStyle],
    zIndex: 102
  })
  map.addLayer(layer)

  return {
    update (geom) {
      source.clear()
      getCoords(geom).forEach((coord, i) => {
        const f = new Feature({ geometry: new Point(coord) })
        f.set('vertexIndex', i)
        source.addFeature(f)
      })
    },

    setSelected (index) {
      selectedIndex = index
      source.changed()
    },

    updateStyle (newVertexStyle) {
      currentStyle = newVertexStyle
      source.changed()
    },

    remove () {
      source.clear()
      map.removeLayer(layer)
    }
  }
}
