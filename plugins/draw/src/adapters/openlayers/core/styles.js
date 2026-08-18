import Style from 'ol/style/Style.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import CircleStyle from 'ol/style/Circle.js'
import Icon from 'ol/style/Icon.js'
import MultiPoint from 'ol/geom/MultiPoint.js'
import { SIZES } from '../defaults.js'
import { getPlacedSketchCoords } from '../utils/sketchHelpers.js'
import { getCachedSymbolImage } from '../../../../../../providers/beta/openlayers/src/utils/symbolImages.js'
import { symbolRegistry } from '../../../../../../src/services/symbolRegistry.js'
import { getSymbolAnchor } from '../../../../../../src/utils/symbolUtils.js'

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

// Shared by edit-mode vertices and in-progress sketch vertices so they always look the same
const createVertexStyles = (colors) => {
  const vertexImage = new CircleStyle({
    radius: SIZES.vertexRadius,
    fill: new Fill({ color: colors.editVertex })
  })
  return {
    vertexImage,
    vertexStyle: new Style({ image: vertexImage }),
    selectedVertexStyle: new Style({ renderer: makeRingRenderer(selectedVertexRadii, colors, 'editVertex') })
  }
}

const createMidpointStyles = (colors) => ({
  midpointStyle: new Style({
    image: new CircleStyle({
      radius: SIZES.midpointRadius,
      fill: new Fill({ color: colors.editMidpoint })
    })
  }),
  selectedMidpointStyle: new Style({ renderer: makeRingRenderer(selectedMidpointRadii, colors, 'editMidpoint') })
})

// Split-line preview colours: valid is solid, invalid is dashed — matching
// ML's stroke-valid-splitter / stroke-invalid-splitter layers.
const createSketchLineStyles = (colors) => ({
  valid: new Style({
    stroke: new Stroke({ color: colors.editStroke, width: 2 }),
    fill: new Fill({ color: colors.editFill })
  }),
  invalid: new Style({
    stroke: new Stroke({ color: colors.invalidStroke, width: 2, lineDash: [2, 4] })
  }),
  splitValid: new Style({
    stroke: new Stroke({ color: colors.splitValid, width: 2 })
  }),
  splitInvalid: new Style({
    stroke: new Stroke({ color: colors.splitInvalid, width: 2, lineDash: [2, 4] })
  })
})

// Placeholder for a committed point feature that has no symbol config, or whose symbol
// image hasn't rasterised/cached yet (point/pointSymbolImages.js resolves it asynchronously
// after the feature is added to the store — this is what renders in the gap, and what
// permanently renders for a point with no symbol properties at all). Stroke/Fill styles
// have no effect on a Point geometry, so without this branch a committed point renders
// invisibly.
const createPointPlaceholderStyle = (colors) => new Style({
  image: new CircleStyle({
    radius: SIZES.vertexRadius + HALO_RADIUS_OFFSET,
    fill: new Fill({ color: colors.shapeFill }),
    stroke: new Stroke({ color: colors.shapeStroke, width: 2 })
  })
})

// ol/style/Icon defaults (anchorOrigin: 'top-left', anchorXUnits/anchorYUnits: 'fraction')
// already match symbolAnchor's own [x,y]-fraction-from-top-left convention, so unlike the
// MapLibre adapter (whose icon-anchor only has 9 discrete positions) no offset compensation
// is needed here — the raw anchor is usable as-is. Icon style instances are cached per
// imageId+anchor+pixelRatio so a style function running every render frame doesn't rebuild
// one each time.
const createPointStyles = (colors) => {
  const pointStyle = createPointPlaceholderStyle(colors)
  const iconStyleCache = new Map()

  const getPointIconStyle = (properties) => {
    const imageId = properties.symbolImageId
    const canvas = imageId && getCachedSymbolImage(imageId)
    if (!canvas) {
      return null
    }
    const symbolDef = symbolRegistry.getSymbolDef(properties)
    const [anchorX, anchorY] = getSymbolAnchor(properties, symbolDef)
    // The cached canvas was rasterised at viewBox × pixelRatio device pixels for crispness
    // (point/pointSymbolImages.js) — unlike MapLibre's map.addImage(id, data, {pixelRatio}),
    // which uses the registered pixelRatio to auto-derive the displayed CSS size, ol/style/
    // Icon draws its source at native pixel size by default, so `scale` has to cancel that
    // back out here or the icon renders pixelRatio× too big.
    const pixelRatio = properties.symbolPixelRatio || 1
    const cacheKey = `${imageId}|${anchorX}|${anchorY}|${pixelRatio}`
    let iconStyle = iconStyleCache.get(cacheKey)
    if (!iconStyle) {
      iconStyle = new Style({ image: new Icon({ img: canvas, anchor: [anchorX, anchorY], scale: 1 / pixelRatio }) })
      iconStyleCache.set(cacheKey, iconStyle)
    }
    return iconStyle
  }

  return {
    pointStyleFor: (feature) => getPointIconStyle(feature.getProperties()) ?? pointStyle
  }
}

/**
 * Create all draw-ol style instances for the given resolved color set.
 *
 * @param {object} colors - Output of resolveColors()
 * @returns {{ vertexStyle, selectedVertexStyle, midpointStyle, selectedMidpointStyle,
 *             editFeatureStyle, createSketchStyle, createFeatureStyle }}
 */
export const createStyles = (colors) => {
  const { vertexImage, vertexStyle, selectedVertexStyle } = createVertexStyles(colors)
  const { midpointStyle, selectedMidpointStyle } = createMidpointStyles(colors)

  const editFeatureStyle = new Style({
    stroke: new Stroke({ color: colors.editStroke, width: 2 }),
    fill: new Fill({ color: colors.editFill })
  })

  // Dashed variant shown while the edited/drawn shape is invalid — no fill, so an
  // invalid shape reads as an outline only.
  const editFeatureStyleInvalid = new Style({
    stroke: new Stroke({ color: colors.invalidStroke, width: 2, lineDash: [2, 4] })
  })

  const sketchLineStyles = createSketchLineStyles(colors)

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
    let lineStyle = invalid ? sketchLineStyles.invalid : sketchLineStyles.valid
    if (splitter === 'valid') { lineStyle = sketchLineStyles.splitValid }
    if (splitter === 'invalid') { lineStyle = sketchLineStyles.splitInvalid }
    return type === geometryType ? [lineStyle, sketchVertexStyle] : [lineStyle]
  }

  const { pointStyleFor } = createPointStyles(colors)

  const createFeatureStyle = () => (feature) => {
    if (feature.getGeometry().getType() === 'Point') {
      return [pointStyleFor(feature)]
    }
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
