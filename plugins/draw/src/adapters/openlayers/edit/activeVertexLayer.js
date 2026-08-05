import VectorSource from 'ol/source/Vector.js'
import VectorLayer from 'ol/layer/Vector.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'

// Above the vertex (102) and midpoint (101) handle layers
const ACTIVE_LAYER_Z_INDEX = 103

/**
 * Overlay layer rendering the currently selected vertex or midpoint handle.
 * The vertex/midpoint layers hide their own circle at the selected index and
 * this layer draws the highlighted version on top.
 *
 * @param {import('ol/Map').default} map
 * @param {() => object} getStyles - returns the manager's current style set
 *   (read at render time so style hot-swaps apply without rewiring)
 * @returns {{ update: (state) => void, remove: () => void }}
 */
export const createActiveVertexLayer = (map, getStyles) => {
  const source = new VectorSource()
  const layer = new VectorLayer({ source, zIndex: ACTIVE_LAYER_Z_INDEX })
  map.addLayer(layer)

  const selectedCoordAndStyle = ({ selectedVertexIndex, selectedVertexType, vertices, midpoints }) => {
    const styles = getStyles()
    if (selectedVertexType === 'vertex') {
      return { coord: vertices[selectedVertexIndex], style: styles.selectedVertexStyle }
    }
    if (selectedVertexType === 'midpoint') {
      return { coord: midpoints[selectedVertexIndex - vertices.length], style: styles.selectedMidpointStyle }
    }
    return { coord: null, style: null }
  }

  return {
    update (state) {
      source.clear()
      if (state.selectedVertexIndex < 0) {
        return
      }
      const { coord, style } = selectedCoordAndStyle(state)
      if (!coord) {
        return
      }
      const feature = new Feature({ geometry: new Point(coord) })
      feature.setStyle(style)
      source.addFeature(feature)
    },

    remove () {
      source.clear()
      map.removeLayer(layer)
    }
  }
}
