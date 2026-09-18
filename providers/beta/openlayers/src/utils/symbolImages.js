/**
 * The OL "last mile" for symbolRegistry's rasterised symbol images: turns the ImageData
 * rasteriseSymbolImage() produces into something OL can render, and caches it by the same
 * content-hash imageId symbolRegistry already computes — so repeated resolves of the same
 * style/theme/pixel-ratio combination are free after the first. Unlike MapLibre
 * (map.addImage), OL has no map-level image registry of its own, so this cache lives at the
 * module level here instead.
 *
 * Two consumers, two shapes cached from the same ImageData:
 * - highlightFeatures.js's symbol-ring overlay builds its own ol/style/Icon directly, so it
 *   wants a raw <canvas> (getOrCreateSymbolImage/getCachedSymbolImage).
 * - OpenLayersDataset.flatStyle's icon-src needs a data URI string instead — both Canvas and
 *   WebGL read flat-style icon-src as a URL, not a raw canvas object (unlike fill-pattern-src,
 *   OL's icon-scale genuinely does decouple native pixel detail from on-screen size for both
 *   renderers — see canvasPatternStyle.js's module doc for why that's *not* true for patterns).
 */

// Fixed oversampling ratio for symbol rasterisation, unrelated to the map's actual pixelRatio
// — unlike patterns, icon-scale genuinely lets a display size be smaller than a texture's
// native pixel count (confirmed against ol/render/webgl/style.js's icon-scale handling, which
// multiplies the symbol quad size and samples the texture with normalised UVs, unlike
// fill-pattern's pixel-indexed sampling — see canvasPatternStyle.js's doc for that contrast).
// So a single fixed high-detail raster, scaled down via icon-scale (1 / this ratio), stays
// crisp at any map pixelRatio with no re-rasterisation needed on resize, the same way patterns
// settled on a fixed PATTERN_RASTER_PIXEL_RATIO baseline — but for icons this constant can
// actually be exploited for genuine resolution independence, not just a display-size no-op.
export const SYMBOL_RASTER_PIXEL_RATIO = 3

const imageCache = new Map() // imageId → HTMLCanvasElement
const dataUriCache = new Map() // imageId → data URI string
const activeImageMap = new Map() // normalId → activeId
const selectedImageMap = new Map() // normalId → selectedId

/** Synchronous lookup for style functions (which must be synchronous) — undefined until
 * getOrCreateSymbolImage() has resolved it at least once. */
export const getCachedSymbolImage = (imageId) => imageCache.get(imageId)

/**
 * Reverse-map a symbol's normal (base) imageId to its active/selected variant — mirrors
 * MapLibre's map._activeSymbolImageMap/_selectedSymbolImageMap (see
 * providers/maplibre/src/utils/symbolImages.js's addSymbolsToMap). Used by highlightFeatures.js
 * to build a select/active highlight for a dataset symbol point, which (unlike a drawn point)
 * has no symbolActiveImageId/symbolSelectedImageId of its own on the feature — only the dataset's
 * own style resolves to one shared base imageId, resolved once here instead.
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

/** Synchronous lookup for OpenLayersDataset.flatStyle (a synchronous getter) — undefined
 * until registerSymbol() has resolved it at least once. */
export const getCachedSymbolDataUri = (imageId) => dataUriCache.get(imageId)

/**
 * Rasterise-once-cache-forever: resolves and caches one symbol's data URI, for flatStyle's
 * icon-src. Reuses the same cached canvas getOrCreateSymbolImage builds, so a symbol used both
 * as a real map layer and as a highlight ring only rasterises once.
 * Also rasterises and caches the active/selected variants (see getActiveSymbolImageId/
 * getSelectedSymbolImageId above) — mirrors MapLibre's addSymbolsToMap, so highlightFeatures.js
 * can build a select/active highlight for a dataset symbol point the same way it already does
 * for a drawn one.
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
