import { getSymbolDef, getSymbolStyleColors, getSymbolViewBox } from '../../../../src/utils/symbolUtils.js'
import { rasteriseToImageData } from './rasteriseToImageData.js'

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

// ─── Rasterisation ────────────────────────────────────────────────────────────

// Module-level cache: imageId → ImageData. Avoids re-rasterising identical symbols.
const imageDataCache = new Map()

const rasteriseSymbolImage = async (dataset, mapStyle, symbolRegistry, selected, pixelRatio) => {
  const symbolDef = getSymbolDef(dataset, symbolRegistry)
  if (!symbolDef) {
    return null
  }
  const styleColors = getSymbolStyleColors(dataset)
  const resolvedContent = selected
    ? symbolRegistry.resolveSelected(symbolDef, styleColors, mapStyle)
    : symbolRegistry.resolve(symbolDef, styleColors, mapStyle)

  const imageId = `symbol-${selected ? 'sel-' : ''}${hashString(resolvedContent)}-${pixelRatio}x`

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
 * Register normal and selected symbol images for the given pre-resolved symbol configs.
 * Skips images that are already registered (safe to call on style change).
 * Updates `map._symbolImageMap` with normal→selected image ID pairs.
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

  // Reset the normal→selected image ID lookup so stale entries don't persist after a style change
  map._symbolImageMap = {}

  await Promise.all(styleArray.flatMap(config => {
    const normalId = getSymbolImageId(config, mapStyle, symbolRegistry, false, pixelRatio)
    const selectedId = getSymbolImageId(config, mapStyle, symbolRegistry, true, pixelRatio)
    if (normalId && selectedId) {
      map._symbolImageMap[normalId] = selectedId
    }
    return [false, true].map(async (selected) => {
      const imageId = selected ? selectedId : normalId
      if (!imageId || map.hasImage(imageId)) {
        return
      }
      const result = await rasteriseSymbolImage(config, mapStyle, symbolRegistry, selected, pixelRatio)
      if (result && !map.hasImage(result.imageId)) {
        map.addImage(result.imageId, result.imageData, { pixelRatio })
      }
    })
  }))
}
