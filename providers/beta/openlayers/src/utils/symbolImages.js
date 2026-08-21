/**
 * The OL "last mile" for symbolRegistry's rasterised symbol images: turns the ImageData
 * rasteriseSymbolImage() produces into something ol/style/Icon can render (a canvas),
 * and caches it by the same content-hash imageId symbolRegistry already computes — so
 * repeated resolves of the same style/theme/pixel-ratio combination are free after the
 * first. Unlike MapLibre (map.addImage), OL has no map-level image registry of its own,
 * so this cache lives at the module level here instead.
 */

const imageCache = new Map() // imageId → HTMLCanvasElement

/** Synchronous lookup for style functions (which must be synchronous) — undefined until
 * getOrCreateSymbolImage() has resolved it at least once. */
export const getCachedSymbolImage = (imageId) => imageCache.get(imageId)

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

/** Mainly for testing — clears every cached image. */
export const clearSymbolImageCache = () => {
  imageCache.clear()
}
