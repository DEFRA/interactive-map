import Style from 'ol/style/Style.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import CircleStyle from 'ol/style/Circle.js'

const COLOR = {
  primary: '#1a65a6',
  white: '#ffffff',
  black: '#000000',
  sketchFill: 'rgba(26,101,166,0.08)',
  featureFill: 'rgba(26,101,166,0.1)'
}

// --- Shared style instances (stateless, reused across renders) ---

// Vertex: solid filled circle, r=6
export const vertexStyle = new Style({
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: COLOR.primary })
  })
})

// Custom renderer draws all arcs at the same (cx,cy) so concentric rings never
// drift at fractional CSS scales (e.g. 1.5×) the way separate drawImage calls can.
const selectedVertexRadii = { outer: 11, mid: 8, inner: 6 }
const selectedMidpointRadii = { outer: 9, mid: 6, inner: 4 }

const makeRingRenderer = ({ outer, mid, inner }) => (pixelCoordinates, state) => {
  const ctx = state.context
  const pr = state.pixelRatio
  const [cx, cy] = /** @type {number[]} */ (pixelCoordinates)
  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, outer * pr, 0, Math.PI * 2); ctx.fillStyle = COLOR.black; ctx.fill()
  ctx.beginPath(); ctx.arc(cx, cy, mid   * pr, 0, Math.PI * 2); ctx.fillStyle = COLOR.white; ctx.fill()
  ctx.beginPath(); ctx.arc(cx, cy, inner * pr, 0, Math.PI * 2); ctx.fillStyle = COLOR.primary; ctx.fill()
  ctx.restore()
}

export const selectedVertexStyle = new Style({ renderer: makeRingRenderer(selectedVertexRadii) })

// Midpoint: solid filled circle, r=4
export const midpointStyle = new Style({
  image: new CircleStyle({
    radius: 4,
    fill: new Fill({ color: COLOR.primary })
  })
})

export const selectedMidpointStyle = new Style({ renderer: makeRingRenderer(selectedMidpointRadii) })

// Style applied directly to the OL feature while in edit mode, overriding its stored colours
export const editFeatureStyle = new Style({
  stroke: new Stroke({ color: COLOR.primary, width: 2 }),
  fill: new Fill({ color: COLOR.featureFill })
})

const sketchLineStyle = new Style({
  stroke: new Stroke({ color: COLOR.primary, width: 2 }),
  fill: new Fill({ color: COLOR.sketchFill })
})

const sketchPointStyle = new Style({
  image: new CircleStyle({
    radius: 5,
    fill: new Fill({ color: COLOR.primary })
  })
})

// --- Style functions ---

export const createSketchStyle = () => (feature) => {
  return feature.getGeometry().getType() === 'Point'
    ? [sketchPointStyle]
    : [sketchLineStyle]
}

export const createFeatureStyle = () => (feature) => {
  const p = feature.getProperties()
  return [new Style({
    stroke: new Stroke({ color: p.stroke || COLOR.primary, width: p.strokeWidth || 2 }),
    fill: new Fill({ color: p.fill || COLOR.featureFill })
  })]
}
