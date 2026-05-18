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

// Selected vertex: primary core r=6, white gap r=6-8, black outer ring r=8-11.
// Two styles instead of three: fill+stroke share one canvas arc so all ring edges
// are drawn in a single call, avoiding sub-pixel drift at fractional CSS scales (e.g. 1.5×).
export const selectedVertexStyle = [
  new Style({ image: new CircleStyle({ radius: 9.5, fill: new Fill({ color: COLOR.white }), stroke: new Stroke({ color: COLOR.black, width: 3 }) }) }),
  new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({ color: COLOR.primary }) }) })
]

// Midpoint: solid filled circle, r=4
export const midpointStyle = new Style({
  image: new CircleStyle({
    radius: 4,
    fill: new Fill({ color: COLOR.primary })
  })
})

// Selected midpoint: primary core r=4, white gap r=4-6, black outer ring r=6-9.
// Same two-style pattern as selectedVertexStyle.
export const selectedMidpointStyle = [
  new Style({ image: new CircleStyle({ radius: 7.5, fill: new Fill({ color: COLOR.white }), stroke: new Stroke({ color: COLOR.black, width: 3 }) }) }),
  new Style({ image: new CircleStyle({ radius: 4, fill: new Fill({ color: COLOR.primary }) }) })
]

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
