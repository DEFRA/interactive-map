/**
 * Snap indicator — a single OL VectorLayer that shows a circle at the active
 * snap candidate position.
 *
 * Vertex snap → orange semi-transparent circle
 * Edge snap   → blue semi-transparent circle
 *
 * Uses Style.renderer (single canvas call) so the circle renders correctly
 * at fractional CSS scale factors.
 */

import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import { Style } from 'ol/style.js'

const RADIUS_PX = 10
const VERTEX_COLOR = 'rgba(230, 120, 0, 0.55)'
const EDGE_COLOR = 'rgba(0, 100, 220, 0.55)'

const makeRenderer = (color) => (coords, state) => {
  const ctx = state.context
  const [cx, cy] = coords
  ctx.beginPath()
  ctx.arc(cx, cy, RADIUS_PX * state.pixelRatio, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
}

const STYLES = {
  vertex: new Style({ renderer: makeRenderer(VERTEX_COLOR) }),
  edge: new Style({ renderer: makeRenderer(EDGE_COLOR) })
}

export const createSnapIndicator = (map) => {
  const source = new VectorSource()
  const layer = new VectorLayer({
    source,
    style: (f) => STYLES[f.get('snapType')] ?? null,
    zIndex: 200,
    updateWhileAnimating: true,
    updateWhileInteracting: true
  })
  map.addLayer(layer)

  const feature = new Feature()
  let showing = false

  return {
    show (coord, type) {
      feature.setGeometry(new Point(coord))
      feature.set('snapType', type, true)
      if (showing) {
        source.changed()
      } else {
        source.addFeature(feature)
        showing = true        
      }
    },

    hide () {
      if (!showing) {
        return
      }
      source.clear()
      showing = false
    },

    remove () {
      source.clear()
      map.removeLayer(layer)
    }
  }
}
