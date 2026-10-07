import { RecentImageSets } from '../../../../src/utils/recentImageSets.js'

const VARIANTS = ['normal', 'active', 'selected']

const ANCHOR_LOW = 0.25
const ANCHOR_HIGH = 0.75
const ANCHOR_CENTRE = 0.5
const HUNDREDTHS = 100

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
const discreteFraction = (fraction) => {
  if (fraction <= ANCHOR_LOW) { return 0 }
  if (fraction >= ANCHOR_HIGH) { return 1 }
  return ANCHOR_CENTRE
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
const round2dp = (value) => Math.round(value * HUNDREDTHS) / HUNDREDTHS

export const anchorToMaplibreOffset = ([ax, ay], viewBox) => {
  const [,, width, height] = viewBox.split(' ').map(Number)
  return [
    round2dp((discreteFraction(ax) - ax) * width),
    round2dp((discreteFraction(ay) - ay) * height)
  ]
}

/**
 * The icon-anchor and icon-offset layout properties that place a symbol image on its point.
 *
 * @param {Object} symbolDef - a sized symbol definition (symbolRegistry.getSymbolDef)
 * @returns {{ 'icon-anchor': string, 'icon-offset': number[] }}
 */
export const getSymbolIconLayout = ({ anchor, viewBox }) => ({
  'icon-anchor': anchorToMaplibre(anchor),
  'icon-offset': anchorToMaplibreOffset(anchor, viewBox)
})

/**
 * The MapLibre provider's record of its registered symbol images. The images themselves live in
 * the map's own image store (map.addImage); this keeps which active (both rings) and selected
 * (black ring) image belongs to each normal one. One per map, shared by every caller that
 * registers symbols on it (e.g. the datasets and draw plugins).
 *
 * Images are kept for the current and previous map size and style; ones only older sizes and
 * styles used are removed from the map, so they don't build up as the map size or style changes.
 */
export class SymbolImageVariants {
  activeImageIds = new Map() // normal imageId → active imageId
  selectedImageIds = new Map() // normal imageId → selected imageId
  recentImageSets = new RecentImageSets()

  /** @param {Object} map - MapLibre map instance */
  constructor (map) {
    this.map = map
  }

  /** A symbol's active (keyboard cursor) variant, from its normal imageId */
  getActiveImageId (normalId) {
    return this.activeImageIds.get(normalId) ?? null
  }

  /** A symbol's selected variant, from its normal imageId */
  getSelectedImageId (normalId) {
    return this.selectedImageIds.get(normalId) ?? null
  }

  removeImage (imageId) {
    if (this.map.hasImage(imageId)) {
      this.map.removeImage(imageId)
    }
    this.activeImageIds.delete(imageId)
    this.selectedImageIds.delete(imageId)
  }

  /**
   * Rasterises and adds each symbol's normal, active and selected images to the map, and maps
   * its normal imageId to the other two. Images the map already has are reused. Then removes
   * images only map sizes and styles older than the previous one used.
   *
   * @param {Object[]} styleArray - an array of symbol configs
   * @param {Object} mapStyle - Current map style config (provides id, selectedColor, haloColor)
   * @param {Object} symbolRegistry
   * @param {number} pixelRatio - Device pixel ratio × map size scale factor
   * @returns {Promise<void>}
   */
  async registerSymbols (styleArray, mapStyle, symbolRegistry, pixelRatio) {
    const { map } = this
    const imageIds = await Promise.all(styleArray.map(async (config) => {
      const variantIds = VARIANTS.map((variant) => symbolRegistry.getSymbolImageId(config, mapStyle, variant, pixelRatio))
      const [normalId, activeId, selectedId] = variantIds
      if (!normalId) {
        return []
      }
      this.activeImageIds.set(normalId, activeId)
      this.selectedImageIds.set(normalId, selectedId)
      await Promise.all(VARIANTS.map(async (variant, index) => {
        if (map.hasImage(variantIds[index])) {
          return
        }
        const result = await symbolRegistry.rasteriseSymbolImage(config, mapStyle, variant, pixelRatio)
        if (result && !map.hasImage(result.imageId)) {
          map.addImage(result.imageId, result.imageData, { pixelRatio })
        }
      }))
      return variantIds.filter(Boolean)
    }))
    this.recentImageSets.add(`${mapStyle?.id}|${pixelRatio}`, imageIds.flat())
      .forEach((imageId) => this.removeImage(imageId))
  }
}
