import { getPatternInnerContent, getPatternImageId, injectColors } from '../../../../src/utils/patternUtils.js'
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
 * @returns {Promise<{ imageId: string, imageData: ImageData }|null>}
 */
const rasterisePattern = async (dataset, mapStyleId, patternRegistry) => {
  const innerContent = getPatternInnerContent(dataset, patternRegistry)
  if (!innerContent) {
    return null
  }

  const imageId = getPatternImageId(dataset, mapStyleId, patternRegistry)
  if (!imageId) {
    return null
  }

  let imageData = imageDataCache.get(imageId)
  if (!imageData) {
    const fg = getValueForStyle(dataset.fillPatternForegroundColor, mapStyleId) || 'black'
    const bg = getValueForStyle(dataset.fillPatternBackgroundColor, mapStyleId) || 'transparent'
    const colored = injectColors(innerContent, fg, bg)
    const bgRect = `<rect width="16" height="16" fill="${bg}"/>`
    // pixelRatio: 2 means the map treats this as an 8×8 logical tile — crisp on retina screens.
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">${bgRect}${colored}</svg>`
    imageData = await rasteriseToImageData(svgString, 16, 16)
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
 * @returns {Promise<void>}
 */
export const registerPatterns = async (map, patternConfigs, mapStyleId, patternRegistry) => {
  if (!patternConfigs.length) {
    return
  }

  await Promise.all(patternConfigs.map(async (config) => {
    const imageId = getPatternImageId(config, mapStyleId, patternRegistry)
    if (!imageId || map.hasImage(imageId)) {
      return
    }
    const result = await rasterisePattern(config, mapStyleId, patternRegistry)
    if (result) {
      map.addImage(result.imageId, result.imageData, { pixelRatio: 2 })
    }
  }))
}
