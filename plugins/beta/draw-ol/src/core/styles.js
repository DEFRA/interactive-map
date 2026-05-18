import Style from 'ol/style/Style.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import CircleStyle from 'ol/style/Circle.js'

const selectedVertexRadii = { outer: 11, mid: 8, inner: 6 }
const selectedMidpointRadii = { outer: 9, mid: 6, inner: 4 }

// Custom renderer draws all arcs at the same (cx,cy) so concentric rings never
// drift at fractional CSS scales (e.g. 1.5×) the way separate drawImage calls can.
const makeRingRenderer = ({ outer, mid, inner }, colors) => (pixelCoordinates, state) => {
  const ctx = state.context
  const pr = state.pixelRatio
  const [cx, cy] = /** @type {number[]} */ (pixelCoordinates)
  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, outer * pr, 0, Math.PI * 2); ctx.fillStyle = colors.halo; ctx.fill()
  ctx.beginPath(); ctx.arc(cx, cy, mid   * pr, 0, Math.PI * 2); ctx.fillStyle = colors.background; ctx.fill()
  ctx.beginPath(); ctx.arc(cx, cy, inner * pr, 0, Math.PI * 2); ctx.fillStyle = colors.primary; ctx.fill()
  ctx.restore()
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Create all draw-ol style instances for the given resolved color set.
 *
 * @param {object} colors - Output of resolveColors()
 * @returns {{ vertexStyle, selectedVertexStyle, midpointStyle, selectedMidpointStyle,
 *             editFeatureStyle, createSketchStyle, createFeatureStyle }}
 */
export const createStyles = (colors) => {
  const vertexStyle = new Style({
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({ color: colors.primary })
    })
  })

  const selectedVertexStyle = new Style({ renderer: makeRingRenderer(selectedVertexRadii, colors) })

  const midpointStyle = new Style({
    image: new CircleStyle({
      radius: 4,
      fill: new Fill({ color: colors.primary })
    })
  })

  const selectedMidpointStyle = new Style({ renderer: makeRingRenderer(selectedMidpointRadii, colors) })

  const editFeatureStyle = new Style({
    stroke: new Stroke({ color: colors.primary, width: 2 }),
    fill: new Fill({ color: colors.fill })
  })

  const sketchLineStyle = new Style({
    stroke: new Stroke({ color: colors.primary, width: 2 }),
    fill: new Fill({ color: colors.sketchFill })
  })

  const sketchPointStyle = new Style({
    image: new CircleStyle({
      radius: 5,
      fill: new Fill({ color: colors.primary })
    })
  })

  const createSketchStyle = () => (feature) =>
    feature.getGeometry().getType() === 'Point' ? [sketchPointStyle] : [sketchLineStyle]

  const createFeatureStyle = () => (feature) => {
    const p = feature.getProperties()
    const id = colors.mapStyleId
    const stroke = (id && p[`stroke${capitalize(id)}`]) || p.stroke || colors.stroke
    const fill = (id && p[`fill${capitalize(id)}`]) || p.fill || colors.fill
    const strokeWidth = p.strokeWidth || colors.strokeWidth
    return [new Style({
      stroke: new Stroke({ color: stroke, width: strokeWidth }),
      fill: new Fill({ color: fill })
    })]
  }

  return {
    vertexStyle,
    selectedVertexStyle,
    midpointStyle,
    selectedMidpointStyle,
    editFeatureStyle,
    createSketchStyle,
    createFeatureStyle
  }
}
