import Style from 'ol/style/Style.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'
import { buildFilterEvaluator } from '../../../../../providers/beta/openlayers/src/utils/filterEvaluator.js'

const DEFAULT_STROKE_WIDTH = 1

/**
 * The Canvas-only escape hatch for genuinely crisp fill patterns, at any pixelRatio.
 *
 * ol/style/flat's declarative fill-pattern-src/fill-pattern-size crops a pattern to its display
 * size rather than scaling it, so it can't hold more source detail than it shows on screen. But
 * ol/style/Fill also accepts a raw CanvasPattern as its colour, built directly from a
 * pixelRatio-scaled source image with no further transform — genuinely resolution-independent,
 * since OL's pattern coordinate space is physical-pixel-equivalent (confirmed empirically).
 *
 * Building actual ol/style/Style objects only works on Canvas — WebGLVector requires flat-style
 * JSON (compiled to GLSL ahead of time), so this module is Canvas-only. See layerBuilders.js's
 * resolveLayerStyle for where this is picked over the shared flatStyle path.
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
 * Rasterise-once-cache-forever — a synchronous cache lookup at style-build time needs this
 * already resolved.
 * @param {Object} style - Dataset style with fillPattern* properties
 * @param {string} mapStyleId
 * @param {Object} patternRegistry
 * @param {number} pixelRatio - the map's current pixelRatio; re-called on resize
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
 * Builds an OL style function for a Canvas-rendered, pattern-bearing dataset/sublayer — uses a
 * real CanvasPattern (see module doc), bypassing OpenLayersDataset.getFlatStyle for this one case.
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
