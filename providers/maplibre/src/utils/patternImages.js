import { getPatternInnerContent, getPatternImageId, injectColors } from '../../../../src/utils/patternUtils.js'
import { getValueForStyle } from '../../../../src/utils/getValueForStyle.js'

const SVG_ERROR_PREVIEW_LENGTH = 80

// Module-level cache: imageId → ImageData. Avoids re-rasterising identical patterns.
const imageDataCache = new Map()

const rasteriseToImageData = (svgString, width, height) =>
  new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image(width, height)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve(ctx.getImageData(0, 0, width, height))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Failed to rasterise pattern SVG: ${svgString.slice(0, SVG_ERROR_PREVIEW_LENGTH)}`))
    }
    img.src = url
  })

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
