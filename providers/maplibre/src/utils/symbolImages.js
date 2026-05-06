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
    const normalId = symbolRegistry.getSymbolImageId(config, mapStyle, false, pixelRatio)
    const activeId = symbolRegistry.getSymbolImageId(config, mapStyle, true, pixelRatio)
    if (normalId && activeId) {
      map._activeSymbolImageMap[normalId] = activeId
    }
    return ['normal', 'active', 'selected'].map(async (variant) => {
      const imageId = variant === 'active' ? activeId : normalId
      if (variant !== 'selected' && (!imageId || map.hasImage(imageId))) {
        return
      }
      const result = await symbolRegistry.rasteriseSymbolImage(config, mapStyle, variant, pixelRatio)
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
