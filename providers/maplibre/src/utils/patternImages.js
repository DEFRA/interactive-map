import { getPatternInnerContent, getPatternImageId, injectColors, PATTERN_MIN_PIXEL_RATIO } from '../../../../src/utils/patternUtils.js'
import { getValueForStyle } from '../../../../src/utils/getValueForStyle.js'
import { rasteriseToImageData } from './rasteriseToImageData.js'

// Module-level cache: imageId → ImageData. Avoids re-rasterising identical patterns.
const imageDataCache = new Map()

/**
 * Rasterises a dataset's pattern SVG to ImageData, using an in-memory cache
 * to avoid re-rasterising identical patterns.
 *
 * @param {Object} dataset
 * @param {string} mapStyleId
 * @param {Object} patternRegistry
 * @param {number} pixelRatio
 * @returns {Promise<{ imageId: string, imageData: ImageData }|null>}
 */
const rasterisePattern = async (dataset, mapStyleId, patternRegistry, pixelRatio) => {
  const innerContent = getPatternInnerContent(dataset, patternRegistry)
  if (!innerContent) {
    return null
  }

  const imageId = getPatternImageId(dataset, mapStyleId, patternRegistry, pixelRatio)
  if (!imageId) {
    return null
  }

  let imageData = imageDataCache.get(imageId)
  if (!imageData) {
    const fg = getValueForStyle(dataset.fillPatternForegroundColor, mapStyleId) || 'black'
    const bg = getValueForStyle(dataset.fillPatternBackgroundColor, mapStyleId) || 'transparent'
    const colored = injectColors(innerContent, fg, bg)
    const bgRect = `<rect width="16" height="16" fill="${bg}"/>`
    // effectiveRatio floored at PATTERN_MIN_PIXEL_RATIO keeps the canvas at ≥16px physical so
    // SVG detail renders crisply. Logical tile size = physicalSize / effectiveRatio = 8px always.
    const effectiveRatio = Math.max(PATTERN_MIN_PIXEL_RATIO, pixelRatio)
    const physicalSize = Math.round(8 * effectiveRatio)
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${physicalSize}" height="${physicalSize}" viewBox="0 0 16 16">${bgRect}${colored}</svg>`
    imageData = await rasteriseToImageData(svgString, physicalSize, physicalSize)
    imageDataCache.set(imageId, imageData)
  }

  return { imageId, imageData }
}

/**
 * Register pattern images for the given pre-resolved pattern configs.
 * Skips images that are already registered (safe to call on style change).
 * Callers are responsible for sublayer merging before passing configs here
 * (see `getPatternConfigs` in the datasets plugin adapter).
 *
 * @param {Object} map - MapLibre map instance
 * @param {Object[]} patternConfigs - Flat list of datasets/merged-sublayers with a pattern config
 * @param {string} mapStyleId
 * @param {Object} patternRegistry
 * @param {number} pixelRatio
 * @returns {Promise<void>}
 */
export const registerPatterns = async (map, patternConfigs, mapStyleId, patternRegistry, pixelRatio) => {
  if (!patternConfigs.length) {
    return
  }

  const effectiveRatio = Math.max(PATTERN_MIN_PIXEL_RATIO, pixelRatio)
  await Promise.all(patternConfigs.map(async (config) => {
    const imageId = getPatternImageId(config, mapStyleId, patternRegistry, pixelRatio)
    if (!imageId || map.hasImage(imageId)) {
      return
    }
    const result = await rasterisePattern(config, mapStyleId, patternRegistry, pixelRatio)
    if (result) {
      map.addImage(result.imageId, result.imageData, { pixelRatio: effectiveRatio })
    }
  }))
}
