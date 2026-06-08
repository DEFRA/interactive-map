import { injectColors, getEffectivePixelRatio } from '../../../../src/utils/patternUtils.js'
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
  const innerContent = patternRegistry.getPatternInnerContent(dataset)
  if (!innerContent) {
    return null
  }

  const imageId = patternRegistry.getPatternImageId(dataset, mapStyleId, pixelRatio)
  if (!imageId) {
    return null
  }

  let imageData = imageDataCache.get(imageId)
  if (!imageData) {
    const fg = getValueForStyle(dataset.fillPatternForegroundColor, mapStyleId) || 'black'
    const bg = getValueForStyle(dataset.fillPatternBackgroundColor, mapStyleId) || 'transparent'
    const colored = injectColors(innerContent, fg, bg)
    const bgRect = `<rect width="16" height="16" fill="${bg}"/>`
    const effectiveRatio = getEffectivePixelRatio(pixelRatio)
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
 *
 * @param {Object} map - MapLibre map instance
 * @param {Object[]} styleArray - an array of pattern style configs
 * @param {string} mapStyleId
 * @param {Object} patternRegistry
 * @param {number} pixelRatio
 * @returns {Promise<void>}
 */
export const addPatternsToMap = async (map, styleArray, mapStyleId, patternRegistry, pixelRatio) => {
  if (!styleArray.length) {
    return
  }

  const effectiveRatio = getEffectivePixelRatio(pixelRatio)
  // Build a unique set of imagesToAdd callbacks to avoid redundant rasterisation and map.addImage calls
  const addImages = styleArray.reduce((imagesToAdd, style) => {
    const imageId = patternRegistry.getPatternImageId(style, mapStyleId, pixelRatio)
    if (imageId && !imagesToAdd[imageId] && !map.hasImage(imageId)) {
      imagesToAdd[imageId] = async () => {
        const result = await rasterisePattern(style, mapStyleId, patternRegistry, pixelRatio)
        if (result && !map.hasImage(result.imageId)) {
          map.addImage(result.imageId, result.imageData, { pixelRatio: effectiveRatio })
        }
      }
    }
    return imagesToAdd
  }, {})
  // Execute the unique set of addImage callbacks in parallel
  await Promise.all(Object.values(addImages).map(addImage => addImage()))
}
