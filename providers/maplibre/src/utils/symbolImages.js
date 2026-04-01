import { getSymbolDef, getSymbolStyleColors, getSymbolViewBox } from '../../../../src/symbols/symbolUtils.js'

const ANCHOR_LOW = 0.25
const ANCHOR_HIGH = 0.75
const SVG_ERROR_PREVIEW_LENGTH = 80
const RETINA_SCALE = 2
const HASH_BASE = 36

const hashString = (str) => {
  let hash = 0
  for (const ch of str) {
    hash = Math.trunc(((hash << 5) - hash) + ch.codePointAt(0))
  }
  return Math.abs(hash).toString(HASH_BASE)
}

// ─── MapLibre-specific anchor conversion ──────────────────────────────────────

/**
 * Converts a fractional [ax, ay] anchor to a MapLibre icon-anchor string.
 * Snaps to the nearest of the 9 standard positions.
 *
 * @param {number[]} anchor - [x, y] in 0–1 space
 * @returns {string} MapLibre icon-anchor value
 */
const xAnchor = (ax) => {
  if (ax <= ANCHOR_LOW) { return 'left' }
  if (ax >= ANCHOR_HIGH) { return 'right' }
  return ''
}

const yAnchor = (ay) => {
  if (ay <= ANCHOR_LOW) { return 'top' }
  if (ay >= ANCHOR_HIGH) { return 'bottom' }
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
 * Based on the hash of the fully resolved SVG content.
 *
 * @param {Object} dataset
 * @param {string} mapStyleId
 * @param {Object} symbolRegistry
 * @param {boolean} [selected=false]
 * @returns {string|null}
 */
export const getSymbolImageId = (dataset, mapStyleId, symbolRegistry, selected = false) => {
  const symbolDef = getSymbolDef(dataset, symbolRegistry)
  if (!symbolDef) { return null }
  const styleColors = getSymbolStyleColors(dataset)
  const resolved = selected
    ? symbolRegistry.resolveSelected(symbolDef, styleColors, mapStyleId)
    : symbolRegistry.resolve(symbolDef, styleColors, mapStyleId)
  return `symbol-${selected ? 'sel-' : ''}${hashString(resolved)}`
}

// ─── Rasterisation ────────────────────────────────────────────────────────────

// Module-level cache: imageId → ImageData. Avoids re-rasterising identical symbols.
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
      reject(new Error(`Failed to rasterise symbol SVG: ${svgString.slice(0, SVG_ERROR_PREVIEW_LENGTH)}`))
    }
    img.src = url
  })

const rasteriseSymbolImage = async (dataset, mapStyleId, symbolRegistry, selected) => {
  const symbolDef = getSymbolDef(dataset, symbolRegistry)
  if (!symbolDef) { return null }
  const styleColors = getSymbolStyleColors(dataset)
  const resolvedContent = selected
    ? symbolRegistry.resolveSelected(symbolDef, styleColors, mapStyleId)
    : symbolRegistry.resolve(symbolDef, styleColors, mapStyleId)

  const imageId = `symbol-${selected ? 'sel-' : ''}${hashString(resolvedContent)}`

  let imageData = imageDataCache.get(imageId)
  if (!imageData) {
    const viewBox = getSymbolViewBox(dataset, symbolDef)
    const [,, width, height] = viewBox.split(' ').map(Number)
    // Render at 2× to keep icons crisp on retina displays.
    // MapLibre receives pixelRatio:2, so the image displays at its original logical size.
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * RETINA_SCALE}" height="${height * RETINA_SCALE}" viewBox="${viewBox}">${resolvedContent}</svg>`
    imageData = await rasteriseToImageData(svgString, width * RETINA_SCALE, height * RETINA_SCALE)
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
 * @param {Object[]} symbolConfigs - Flat list of datasets/merged-sublayers that have a symbol config
 * @param {string} mapStyleId
 * @param {Object} symbolRegistry
 * @returns {Promise<void>}
 */
export const registerSymbols = async (map, symbolConfigs, mapStyleId, symbolRegistry) => {
  if (!symbolConfigs.length) { return }

  // Reset the normal→selected image ID lookup so stale entries don't persist after a style change
  map._symbolImageMap = {}

  await Promise.all(symbolConfigs.flatMap(config => {
    const normalId = getSymbolImageId(config, mapStyleId, symbolRegistry, false)
    const selectedId = getSymbolImageId(config, mapStyleId, symbolRegistry, true)
    if (normalId && selectedId) {
      map._symbolImageMap[normalId] = selectedId
    }
    return [false, true].map(async (selected) => {
      const imageId = selected ? selectedId : normalId
      if (!imageId || map.hasImage(imageId)) { return }
      const result = await rasteriseSymbolImage(config, mapStyleId, symbolRegistry, selected)
      if (result) {
        map.addImage(result.imageId, result.imageData, { pixelRatio: 2 })
      }
    })
  }))
}
