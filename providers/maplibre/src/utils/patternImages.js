import { getEffectivePixelRatio } from '../../../../src/utils/patternUtils.js'

/**
 * Register pattern images for the given pre-resolved pattern configs.
 * Skips images that are already registered (safe to call on style change).
 * Rasterisation itself lives in patternRegistry.rasterisePatternImage, shared with OpenLayers —
 * this only owns the MapLibre-specific "last mile" of registering via map.addImage().
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
        const result = await patternRegistry.rasterisePatternImage(style, mapStyleId, pixelRatio)
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
