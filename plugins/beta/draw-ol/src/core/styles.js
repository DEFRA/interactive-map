import Style from 'ol/style/Style.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import CircleStyle from 'ol/style/Circle.js'

const COLOR = {
  primary: '#3b82f6',   // vertex stroke, sketch line, default feature stroke
  selected: '#f97316',  // selected vertex
  midpoint: '#94a3b8',  // midpoint handle
  white: '#ffffff',
  sketchFill: 'rgba(59,130,246,0.08)',
  featureFill: 'rgba(59,130,246,0.1)'
}

// --- Shared style instances (stateless, reused across renders) ---

const vertexStyle = new Style({
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: COLOR.white }),
    stroke: new Stroke({ color: COLOR.primary, width: 2 })
  })
})

const selectedVertexStyle = new Style({
  image: new CircleStyle({
    radius: 7,
    fill: new Fill({ color: COLOR.white }),
    stroke: new Stroke({ color: COLOR.selected, width: 2.5 })
  })
})

const midpointStyle = new Style({
  image: new CircleStyle({
    radius: 4,
    fill: new Fill({ color: COLOR.white }),
    stroke: new Stroke({ color: COLOR.midpoint, width: 1.5 })
  })
})

const sketchLineStyle = new Style({
  stroke: new Stroke({ color: COLOR.primary, width: 2, lineDash: [6, 4] }),
  fill: new Fill({ color: COLOR.sketchFill })
})

const sketchPointStyle = new Style({
  image: new CircleStyle({
    radius: 5,
    fill: new Fill({ color: COLOR.primary }),
    stroke: new Stroke({ color: COLOR.white, width: 1.5 })
  })
})

// --- Style functions ---

/**
 * Style for OL Draw interaction's sketch overlay.
 * Receives a sketch feature (Point, LineString, or Polygon).
 */
export const createSketchStyle = () => (feature) => {
  return feature.getGeometry().getType() === 'Point'
    ? [sketchPointStyle]
    : [sketchLineStyle]
}

/**
 * Style for OL Modify interaction's vertex overlay.
 * Uses a mutable `state` ref so EditMode can update selectedCoord
 * without recreating the style function.
 *
 * @param {{ selectedCoord: number[]|null }} state
 */
export const createEditStyle = (state) => (feature) => {
  if (feature.getGeometry().getType() !== 'Point') return [sketchLineStyle]
  const [ex, ey] = feature.getGeometry().getCoordinates()
  const sel = state.selectedCoord
  const isSelected = sel && Math.abs(ex - sel[0]) < 1 && Math.abs(ey - sel[1]) < 1
  return [isSelected ? selectedVertexStyle : vertexStyle]
}

/** Style for the midpoint overlay layer (always the same). */
export const getMidpointStyle = () => midpointStyle

/**
 * Style for completed features in the main VectorLayer.
 * Reads stroke/fill/strokeWidth from feature properties if set.
 */
export const createFeatureStyle = () => (feature) => {
  const p = feature.getProperties()
  return [new Style({
    stroke: new Stroke({ color: p.stroke || COLOR.primary, width: p.strokeWidth || 2 }),
    fill: new Fill({ color: p.fill || COLOR.featureFill })
  })]
}
