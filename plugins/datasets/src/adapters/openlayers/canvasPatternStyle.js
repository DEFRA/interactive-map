import Style from 'ol/style/Style.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'
import { buildFilterEvaluator } from '../../../../../providers/beta/openlayers/src/utils/filterEvaluator.js'

const DEFAULT_STROKE_WIDTH = 1

/**
 * The Canvas-only escape hatch for genuinely crisp fill patterns, at any pixelRatio.
 *
 * ol/style/flat's declarative `fill-pattern-src`/`fill-pattern-size` cannot decouple a pattern's
 * native pixel count from its on-screen CSS size — confirmed directly from ol/render/webgl/
 * style.js's sampleFillPattern shader (which divides by the texture's raw native size, not a
 * requested display size) and from ol/style/Fill.js's identical crop-only behaviour on the
 * Canvas side. Neither renderer's flat-style path can hold more source detail than its display
 * footprint.
 *
 * But `ol/style/Fill` also accepts a raw `CanvasPattern` object as its colour (not just a flat
 * style descriptor) — and `CanvasPattern` is a genuinely richer JS API than flat-style exposes:
 * it can be built from a native-pixelRatio-scaled source image and used as-is with no further
 * transform, because patternRegistry.rasterisePatternImage(style, mapStyleId, pixelRatio) already
 * rasterises at exactly `16 × pixelRatio` physical pixels for a given pixelRatio — the same
 * MapLibre-style "physical pixels ÷ pixelRatio = logical/CSS size" convention MapLibre's own
 * map.addImage(id, data, {pixelRatio}) relies on. Used directly as a CanvasPattern's source
 * with no scaling, that image occupies exactly `16 × pixelRatio` of OL's own pattern coordinate
 * space (confirmed empirically: that space is physical-backing-store-pixel equivalent, not CSS
 * pixel equivalent), which is exactly 16 CSS pixels once divided back down by pixelRatio at
 * display time — i.e. genuinely resolution-independent, with no cropping and no manual
 * setTransform maths required.
 *
 * This only works building actual ol/style/Style objects (a style function, since sublayer
 * filters still need evaluating per-feature) — ol/layer/WebGLVector requires flat-style JSON
 * only (everything is compiled to GLSL ahead of time), so this module is Canvas-only. See
 * layerBuilders.js's resolveLayerStyle for where this is picked over the shared flatStyle path.
 */

const crispPatternCache = new Map() // imageId (already pixelRatio-scoped, see patternRegistry) → Fill

const cacheKey = (imageId) => imageId

export const getCachedCrispPatternFill = (imageId) => crispPatternCache.get(cacheKey(imageId))

const buildPatternFill = (imageData) => {
  const source = document.createElement('canvas')
  source.width = imageData.width
  source.height = imageData.height
  source.getContext('2d').putImageData(imageData, 0, 0)
  const scratch = document.createElement('canvas')
  const pattern = scratch.getContext('2d').createPattern(source, 'repeat')
  return new Fill({ color: pattern })
}

/**
 * Rasterise-once-cache-forever, mirroring providers/beta/openlayers/src/utils/patternImages.js's
 * registerPattern — a synchronous cache lookup at style-build time needs this already resolved.
 * @param {Object} style - Dataset style with fillPattern* properties
 * @param {string} mapStyleId
 * @param {Object} patternRegistry
 * @param {number} pixelRatio - the map's actual current pixelRatio (not a fixed constant) —
 *   re-called from onMapSizeChange whenever this changes, so the cached Fill always matches
 *   the map's current rendering density.
 * @returns {Promise<void>}
 */
export const registerCrispCanvasPattern = async (style, mapStyleId, patternRegistry, pixelRatio) => {
  const imageId = patternRegistry.getPatternImageId(style, mapStyleId, pixelRatio)
  if (!imageId || crispPatternCache.has(cacheKey(imageId))) {
    return
  }
  const result = await patternRegistry.rasterisePatternImage(style, mapStyleId, pixelRatio)
  if (!result) {
    return
  }
  const key = cacheKey(result.imageId)
  if (!crispPatternCache.has(key)) {
    crispPatternCache.set(key, buildPatternFill(result.imageData))
  }
}

/** Register every pattern style in the given array, in parallel. */
export const registerCrispCanvasPatterns = async (styleArray, mapStyleId, patternRegistry, pixelRatio) => {
  if (!styleArray.length) {
    return
  }
  await Promise.all(styleArray.map(style => registerCrispCanvasPattern(style, mapStyleId, patternRegistry, pixelRatio)))
}

/** Mainly for testing — clears every cached Fill. */
export const clearCrispPatternCache = () => {
  crispPatternCache.clear()
}

const buildStroke = (registryDataset, mapStyleId) => {
  if (!registryDataset.hasStroke) {
    return undefined
  }
  return new Stroke({
    color: getValueForStyle(registryDataset.style.stroke, mapStyleId),
    width: registryDataset.style.strokeWidth || DEFAULT_STROKE_WIDTH,
    lineDash: registryDataset.style.strokeDashArray
  })
}

/**
 * Builds an OL style function for a Canvas-rendered, pattern-bearing dataset/sublayer — the
 * Fill uses a real CanvasPattern (see module doc) rather than flat-style's fill-pattern-src, so
 * this bypasses OpenLayersDataset.flatStyle entirely for this one case.
 * @param {Object} registryDataset - an OpenLayersDataset with hasPattern true
 * @param {string} mapStyleId
 * @param {number} pixelRatio - must match what registerCrispCanvasPattern was last called with
 * @param {Object} patternRegistry
 * @returns {import('ol/style/Style.js').StyleFunction}
 */
export const buildCanvasPatternStyle = (registryDataset, mapStyleId, pixelRatio, patternRegistry) => {
  const imageId = patternRegistry.getPatternImageId(registryDataset.style, mapStyleId, pixelRatio)
  const fill = imageId && getCachedCrispPatternFill(imageId)
  const style = fill ? new Style({ fill, stroke: buildStroke(registryDataset, mapStyleId) }) : undefined
  const matchesFilter = buildFilterEvaluator(registryDataset.filter)

  return (feature) => {
    if (!style) {
      return undefined
    }
    if (matchesFilter && !matchesFilter(feature)) {
      return undefined
    }
    return style
  }
}
