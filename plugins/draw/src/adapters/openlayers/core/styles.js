import Style from 'ol/style/Style.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import CircleStyle from 'ol/style/Circle.js'
import MultiPoint from 'ol/geom/MultiPoint.js'
import { SIZES } from '../defaults.js'
import { getPlacedSketchCoords } from '../utils/sketchHelpers.js'

const HALO_RADIUS_OFFSET = 3

const selectedVertexRadii = { outer: SIZES.vertexHaloRadius + HALO_RADIUS_OFFSET, mid: SIZES.vertexHaloRadius, inner: SIZES.vertexRadius }
const selectedMidpointRadii = { outer: SIZES.midpointHaloRadius + HALO_RADIUS_OFFSET, mid: SIZES.midpointHaloRadius, inner: SIZES.midpointRadius }

const fillArc = (ctx, cx, cy, radius, fillStyle) => {
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = fillStyle
  ctx.fill()
}

// Custom renderer draws all arcs at the same (cx,cy) so concentric rings never
// drift at fractional CSS scales (e.g. 1.5×) the way separate drawImage calls can.
const makeRingRenderer = ({ outer, mid, inner }, colors, innerKey) => (pixelCoordinates, state) => {
  const ctx = state.context
  const pr = state.pixelRatio
  const [cx, cy] = /** @type {number[]} */ (pixelCoordinates)
  ctx.save()
  fillArc(ctx, cx, cy, outer * pr, colors.editActive)
  fillArc(ctx, cx, cy, mid * pr, colors.editHalo)
  fillArc(ctx, cx, cy, inner * pr, colors[innerKey])
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
  // Shared by edit-mode vertices and in-progress sketch vertices so they always look the same
  const vertexImage = new CircleStyle({
    radius: SIZES.vertexRadius,
    fill: new Fill({ color: colors.editVertex })
  })

  const vertexStyle = new Style({ image: vertexImage })

  const selectedVertexStyle = new Style({ renderer: makeRingRenderer(selectedVertexRadii, colors, 'editVertex') })

  const midpointStyle = new Style({
    image: new CircleStyle({
      radius: SIZES.midpointRadius,
      fill: new Fill({ color: colors.editMidpoint })
    })
  })

  const selectedMidpointStyle = new Style({ renderer: makeRingRenderer(selectedMidpointRadii, colors, 'editMidpoint') })

  const editFeatureStyle = new Style({
    stroke: new Stroke({ color: colors.editStroke, width: 2 }),
    fill: new Fill({ color: colors.editFill })
  })

  // Dashed variant shown while the edited/drawn shape is invalid — no fill, so an
  // invalid shape reads as an outline only.
  const editFeatureStyleInvalid = new Style({
    stroke: new Stroke({ color: colors.invalidStroke, width: 2, lineDash: [2, 4] })
  })

  const sketchLineStyle = new Style({
    stroke: new Stroke({ color: colors.editStroke, width: 2 }),
    fill: new Fill({ color: colors.editFill })
  })

  const sketchLineStyleInvalid = new Style({
    stroke: new Stroke({ color: colors.invalidStroke, width: 2, lineDash: [2, 4] })
  })

  // Split-line preview colours: valid is solid, invalid is dashed — matching
  // ML's stroke-valid-splitter / stroke-invalid-splitter layers.
  const sketchLineStyleSplitValid = new Style({
    stroke: new Stroke({ color: colors.splitValid, width: 2 })
  })

  const sketchLineStyleSplitInvalid = new Style({
    stroke: new Stroke({ color: colors.splitInvalid, width: 2, lineDash: [2, 4] })
  })

  // Reused across renders — the geometry function runs every frame while sketching,
  // so mutate one MultiPoint (setCoordinates bumps its revision, keeping OL's
  // render caches correct) instead of allocating a new one per frame
  const sketchVertices = new MultiPoint([])
  const sketchVertexStyle = new Style({
    image: vertexImage,
    geometry: (feature) => {
      const coords = getPlacedSketchCoords(feature.getGeometry())
      if (!coords.length) {
        return null
      }
      sketchVertices.setCoordinates(coords)
      return sketchVertices
    }
  })

  // No style for the Point sketch (cursor-following ghost marker); placed
  // vertices get markers on the sketch feature instead. geometryType filters
  // out the extra LineString sketch OL renders alongside a Polygon sketch,
  // so vertices aren't drawn twice. `invalid` swaps to the dashed line style.
  // A 'splitter' property on the feature (set via setDrawingPreviewProperty)
  // overrides both with the split-specific valid/invalid colours.
  const createSketchStyle = (geometryType, invalid = false) => (feature) => {
    const type = feature.getGeometry().getType()
    if (type === 'Point') { return [] }
    const splitter = feature.get('splitter')
    let lineStyle = invalid ? sketchLineStyleInvalid : sketchLineStyle
    if (splitter === 'valid') { lineStyle = sketchLineStyleSplitValid }
    if (splitter === 'invalid') { lineStyle = sketchLineStyleSplitInvalid }
    return type === geometryType ? [lineStyle, sketchVertexStyle] : [lineStyle]
  }

  const createFeatureStyle = () => (feature) => {
    const p = feature.getProperties()
    const id = colors.mapStyleId
    const stroke = (id && p[`stroke${capitalize(id)}`]) || p.stroke || colors.shapeStroke
    const fill = (id && p[`fill${capitalize(id)}`]) || p.fill || colors.shapeFill
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
    editFeatureStyleInvalid,
    createSketchStyle,
    createFeatureStyle
  }
}
