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

// The discrete fraction (0, 0.5 or 1) icon-anchor actually renders a given axis at — the
// same left/right/top/bottom/center snapping xAnchor/yAnchor above already do, expressed as
// a number instead of a string so it can be compared against the true, unsnapped fraction.
const discreteFraction = (a) => {
  if (a <= ANCHOR_LOW) { return 0 }
  if (a >= ANCHOR_HIGH) { return 1 }
  return 0.5
}

/**
 * MapLibre's icon-anchor only has 9 discrete positions — anchorToMaplibre above snaps a
 * fractional anchor to the nearest one, which loses precision for anything off-grid (e.g.
 * pin's [0.5, 0.9] renders as if it were 1.0/'bottom', shifting the whole icon ~10% of its
 * height off from where a DOM marker using the same anchor value would place it —
 * SymbolMarker.jsx positions markers with the exact fraction via CSS margins, with no such
 * snapping). icon-offset corrects this: the pixel distance, in the icon's own display-space
 * dimensions (derived from its viewBox), between the true anchor and the discrete one it
 * snapped to — applied on top of icon-anchor, on both provider and dataset symbol layers.
 *
 * @param {number[]} anchor - [x, y] in 0–1 space (the true, unsnapped anchor)
 * @param {string} viewBox - SVG viewBox string, e.g. '0 0 44 44'
 * @returns {number[]} [offsetX, offsetY] in pixels, for the icon-offset layout property
 */
// Rounded to 2dp: sub-hundredth-of-a-pixel precision is meaningless for rendering, and
// without it fractions like 0.8 produce float noise (8.799999999999997, not 8.8).
const round2dp = (n) => Math.round(n * 100) / 100

export const anchorToMaplibreOffset = ([ax, ay], viewBox) => {
  const [,, width, height] = viewBox.split(' ').map(Number)
  return [
    round2dp((discreteFraction(ax) - ax) * width),
    round2dp((discreteFraction(ay) - ay) * height)
  ]
}

/**
 * Register normal, active (both rings) and selected (black ring) symbol images.
 * Skips images that are already registered (safe to call on style change).
 * Merges into `map._activeSymbolImageMap` (normal→active) and `map._selectedSymbolImageMap`
 * (normal→selected) rather than replacing them — more than one caller (e.g. the datasets
 * and draw plugins) can register symbols on the same map, and each call must add to that
 * shared registry, not wipe out whatever another caller already registered there.
 *
 * @param {Object} map - MapLibre map instance
 * @param {Object[]} styleArray - an array of symbol configs
 * @param {Object} mapStyle - Current map style config (provides id, selectedColor, haloColor)
 * @param {Object} symbolRegistry
 * @param {number} [pixelRatio=2] - Device pixel ratio × map size scale factor (computed by caller)
 * @returns {Promise<void>}
 */
export const addSymbolsToMap = async (map, styleArray, mapStyle, symbolRegistry, pixelRatio = 2) => {
  if (!styleArray.length) {
    return
  }

  map._activeSymbolImageMap ??= {}
  map._selectedSymbolImageMap ??= {}

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
