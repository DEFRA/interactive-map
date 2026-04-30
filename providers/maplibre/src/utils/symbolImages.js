const ANCHOR_LOW = 0.25
const ANCHOR_HIGH = 0.75

// ─── MapLibre-specific anchor conversion ──────────────────────────────────────

/**
 * Converts a fractional [ax, ay] anchor to a MapLibre icon-anchor string.
 * Snaps to the nearest of the 9 standard positions.
 *
 * @param {number[]} anchor - [x, y] in 0–1 space
 * @returns {string} MapLibre icon-anchor value
 */
const xAnchor = (ax) => {
  if (ax <= ANCHOR_LOW) {
    return 'left'
  }
  if (ax >= ANCHOR_HIGH) {
    return 'right'
  }
  return ''
}

const yAnchor = (ay) => {
  if (ay <= ANCHOR_LOW) {
    return 'top'
  }
  if (ay >= ANCHOR_HIGH) {
    return 'bottom'
  }
  return ''
}

export const anchorToMaplibre = ([ax, ay]) => {
  const x = xAnchor(ax)
  const y = yAnchor(ay)
  return (y + (x && y ? '-' : '') + x) || 'center'
}

// ─── Image IDs ────────────────────────────────────────────────────────────────

/**
 * Returns a deterministic image ID for a symbol in normal or selected state.
 * Based on the hash of the fully resolved SVG content and the pixel ratio.
 *
 * @param {Object} dataset
 * @param {Object} mapStyle - Current map style config (provides id, selectedColor, haloColor)
 * @param {Object} symbolRegistry
 * @param {boolean} [selected=false]
 * @param {number} [pixelRatio=2] - Device pixel ratio × map size scale factor
 * @returns {string|null}
 */
export const getSymbolImageId = (dataset, mapStyle, symbolRegistry, active = false, pixelRatio = 2) => {
  const symbolDef = getSymbolDef(dataset, symbolRegistry)
  if (!symbolDef) {
    return null
  }
  const styleColors = getSymbolStyleColors(dataset)
  const resolved = active
    ? symbolRegistry.resolveActive(symbolDef, styleColors, mapStyle)
    : symbolRegistry.resolve(symbolDef, styleColors, mapStyle)
  return `symbol-${active ? 'act-' : ''}${hashString(resolved)}-${pixelRatio}x`
}

// ─── Rasterisation ────────────────────────────────────────────────────────────

// Module-level cache: imageId → ImageData. Avoids re-rasterising identical symbols.
const imageDataCache = new Map()

/**
 * Rasterise one variant of a symbol to ImageData for use as a MapLibre image.
 * Results are cached by imageId so identical symbols are only rendered once.
 *
 * @param {Object} dataset - Dataset or marker config with symbol properties
 * @param {Object} mapStyle - Current map style config
 * @param {Object} symbolRegistry
 * @param {'normal'|'active'|'selected'} variant
 *   - `'normal'`   — no rings (default display)
 *   - `'active'`   — both rings (keyboard cursor, yellow + black)
 *   - `'selected'` — selected ring only (black)
 * @param {number} pixelRatio - Device pixel ratio × map size scale factor
 * @returns {Promise<{imageId: string, imageData: ImageData}|null>}
 */
const rasteriseSymbolImage = async (dataset, mapStyle, symbolRegistry, variant, pixelRatio) => {
  const symbolDef = getSymbolDef(dataset, symbolRegistry)
  if (!symbolDef) {
    return null
  }
  const styleColors = getSymbolStyleColors(dataset)
  let resolvedContent, prefix
  if (variant === 'active') {
    resolvedContent = symbolRegistry.resolveActive(symbolDef, styleColors, mapStyle)
    prefix = 'act-'
  } else if (variant === 'selected') {
    resolvedContent = symbolRegistry.resolveSelected(symbolDef, styleColors, mapStyle)
    prefix = 'sel-'
  } else {
    resolvedContent = symbolRegistry.resolve(symbolDef, styleColors, mapStyle)
    prefix = ''
  }

  const imageId = `symbol-${prefix}${hashString(resolvedContent)}-${pixelRatio}x`

  let imageData = imageDataCache.get(imageId)
  if (!imageData) {
    const viewBox = getSymbolViewBox(dataset, symbolDef)
    const [,, width, height] = viewBox.split(' ').map(Number)
    // Render at pixelRatio× to keep icons crisp at the current device DPI and map size.
    // MapLibre receives the matching pixelRatio so the image displays at its original logical size.
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * pixelRatio}" height="${height * pixelRatio}" viewBox="${viewBox}">${resolvedContent}</svg>`
    imageData = await rasteriseToImageData(svgString, width * pixelRatio, height * pixelRatio)
    imageDataCache.set(imageId, imageData)
  }

  return { imageId, imageData }
}

/**
 * Register normal, active (both rings) and selected (black ring) symbol images.
 * Skips images that are already registered (safe to call on style change).
 * Updates `map._activeSymbolImageMap` (normal→active) and `map._selectedSymbolImageMap` (normal→selected).
 *
 * Callers are responsible for resolving sublayers before calling this function
 * (see `getSymbolConfigs` in the datasets plugin adapter).
 *
 * @param {Object} map - MapLibre map instance
 * @param {Object[]} styleArray - Flat list of datasets/merged-sublayers that have a symbol config
 * @param {Object} mapStyle - Current map style config (provides id, selectedColor, haloColor)
 * @param {Object} symbolRegistry
 * @param {number} [pixelRatio=2] - Device pixel ratio × map size scale factor (computed by caller)
 * @returns {Promise<void>}
 */
export const addSymbolsToMap = async (map, styleArray, mapStyle, symbolRegistry, pixelRatio = 2) => {
  if (!styleArray.length) {
    return
  }

  map._activeSymbolImageMap = {}
  map._selectedSymbolImageMap = {}

  await Promise.all(styleArray.flatMap(config => {
    const normalId = getSymbolImageId(config, mapStyle, symbolRegistry, false, pixelRatio)
    const activeId = getSymbolImageId(config, mapStyle, symbolRegistry, true, pixelRatio)
    if (normalId && activeId) {
      map._activeSymbolImageMap[normalId] = activeId
    }
    return ['normal', 'active', 'selected'].map(async (variant) => {
      const imageId = variant === 'active' ? activeId : normalId
      if (variant !== 'selected' && (!imageId || map.hasImage(imageId))) {
        return
      }
      const result = await rasteriseSymbolImage(config, mapStyle, symbolRegistry, variant, pixelRatio)
      if (result) {
        if (variant === 'selected' && normalId) {
          map._selectedSymbolImageMap[normalId] = result.imageId
        }
        if (!map.hasImage(result.imageId)) {
          map.addImage(result.imageId, result.imageData, { pixelRatio })
        }
      }
    })
  }))
}
