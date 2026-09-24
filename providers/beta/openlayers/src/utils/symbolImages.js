/**
 * The OL "last mile" for symbolRegistry's rasterised symbol images: turns the ImageData
 * rasteriseSymbolImage() produces into something OL can render, cached by the same imageId
 * symbolRegistry computes. OL has no map-level image registry like MapLibre's map.addImage,
 * so this cache lives at the module level instead.
 *
 * Two consumers need two different shapes from the same ImageData: highlightFeatures.js builds
 * its own ol/style/Icon directly, so it wants a raw <canvas> (getOrCreateSymbolImage/
 * getCachedSymbolImage); OpenLayersDataset.getFlatStyle's icon-src needs a data URI string instead.
 */

const imageCache = new Map() // imageId → HTMLCanvasElement
const dataUriCache = new Map() // imageId → data URI string
const activeImageMap = new Map() // normalId → activeId
const selectedImageMap = new Map() // normalId → selectedId

/** Synchronous lookup for style functions (which must be synchronous) — undefined until
 * getOrCreateSymbolImage() has resolved it at least once. */
export const getCachedSymbolImage = (imageId) => imageCache.get(imageId)

/**
 * Reverse-map a symbol's normal (base) imageId to its active/selected variant, mirroring
 * MapLibre's own active/selected image maps. Used by highlightFeatures.js to highlight a
 * dataset symbol point, which (unlike a drawn point) has no active/selected id of its own.
 */
export const getActiveSymbolImageId = (normalId) => activeImageMap.get(normalId) ?? null
export const getSelectedSymbolImageId = (normalId) => selectedImageMap.get(normalId) ?? null

/**
 * Rasterise-once-cache-forever: draws the given ImageData onto a canvas the first time
 * imageId is seen, and returns the cached canvas on every subsequent call.
 *
 * @param {string} imageId
 * @param {ImageData} imageData
 * @returns {HTMLCanvasElement}
 */
export const getOrCreateSymbolImage = (imageId, imageData) => {
  const cached = imageCache.get(imageId)
  if (cached) {
    return cached
  }
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  canvas.getContext('2d').putImageData(imageData, 0, 0)
  imageCache.set(imageId, canvas)
  return canvas
}

/** Synchronous lookup for OpenLayersDataset.getFlatStyle (which is synchronous) — undefined
 * until registerSymbol() has resolved it at least once. */
export const getCachedSymbolDataUri = (imageId) => dataUriCache.get(imageId)

/**
 * Rasterise-once-cache-forever: resolves and caches one symbol's data URI for flatStyle's
 * icon-src, plus its active/selected variants so highlightFeatures.js can highlight a dataset
 * symbol point the same way it already does for a drawn one.
 * @param {Object} style - Dataset style with symbol/symbolSvgContent properties
 * @param {Object} mapStyle - Current map style config
 * @param {Object} symbolRegistry
 * @param {number} pixelRatio - the map's actual current pixelRatio
 * @returns {Promise<void>}
 */
export const registerSymbol = async (style, mapStyle, symbolRegistry, pixelRatio) => {
  const normalId = symbolRegistry.getSymbolImageId(style, mapStyle, false, pixelRatio)
  if (!normalId) {
    return
  }
  const activeId = symbolRegistry.getSymbolImageId(style, mapStyle, true, pixelRatio)
  if (activeId) {
    activeImageMap.set(normalId, activeId)
  }

  await Promise.all(['normal', 'active', 'selected'].map(async (variant) => {
    const imageId = variant === 'active' ? activeId : normalId
    if (variant !== 'selected' && (!imageId || imageCache.has(imageId))) {
      return
    }
    const result = await symbolRegistry.rasteriseSymbolImage(style, mapStyle, variant, pixelRatio)
    if (!result) {
      return
    }
    if (variant === 'selected') {
      selectedImageMap.set(normalId, result.imageId)
    }
    if (!imageCache.has(result.imageId)) {
      const canvas = getOrCreateSymbolImage(result.imageId, result.imageData)
      if (variant === 'normal') {
        dataUriCache.set(result.imageId, canvas.toDataURL())
      }
    }
  }))
}

/** Register symbol data URIs for the given pre-resolved style configs, in parallel. */
export const registerSymbols = async (styleArray, mapStyle, symbolRegistry, pixelRatio) => {
  if (!styleArray.length) {
    return
  }
  await Promise.all(styleArray.map(style => registerSymbol(style, mapStyle, symbolRegistry, pixelRatio)))
}

/** Mainly for testing — clears every cached image. */
export const clearSymbolImageCache = () => {
  imageCache.clear()
  dataUriCache.clear()
  activeImageMap.clear()
  selectedImageMap.clear()
}
