import { hashString } from './layerIds.js'
import { mergeSublayer } from '../../utils/mergeSublayer.js'

// Keys in an object-form symbol config that are not token values
const SYMBOL_STRUCTURAL = new Set(['id', 'symbolSvgContent', 'viewBox', 'anchor'])

// Top-level dataset props (after style flattening) that are symbol token overrides
const DATASET_SYMBOL_TOKENS = new Set(['graphic'])

const ANCHOR_LOW = 0.25
const ANCHOR_HIGH = 0.75
const SVG_ERROR_PREVIEW_LENGTH = 80
const RETINA_SCALE = 2

// ─── Detection ────────────────────────────────────────────────────────────────

/**
 * Returns true if this dataset should be rendered as a symbol (point) layer.
 * @param {Object} dataset
 * @returns {boolean}
 */
export const hasSymbol = (dataset) => !!dataset.symbol

// ─── Config resolution ────────────────────────────────────────────────────────

/**
 * Resolves the symbolDef for a dataset's symbol config.
 *
 * dataset.symbol may be:
 *   - a string: registered symbol ID, e.g. 'pin'
 *   - an object with symbolSvgContent: inline SVG definition
 *   - an object with id: look up from registry
 *
 * @param {Object} dataset
 * @param {Object} symbolRegistry
 * @returns {Object|undefined}
 */
export const getSymbolDef = (dataset, symbolRegistry) => {
  const { symbol } = dataset
  if (!symbol) { return undefined }
  if (typeof symbol === 'string') {
    return symbolRegistry.get(symbol)
  }
  if (symbol.symbolSvgContent) {
    return { svg: symbol.symbolSvgContent, ...symbol }
  }
  if (symbol.id) {
    return symbolRegistry.get(symbol.id)
  }
  return undefined
}

/**
 * Extracts token overrides from an object-form symbol config.
 * Structural keys (id, symbolSvgContent, viewBox, anchor) are excluded.
 * Returns an empty object for string-form symbol configs.
 *
 * @param {Object} dataset
 * @returns {Object}
 */
export const getSymbolStyleColors = (dataset) => {
  const { symbol } = dataset
  if (!symbol) { return {} }
  // Collect top-level token overrides from the flattened dataset (e.g. dataset.graphic)
  const tokens = {}
  DATASET_SYMBOL_TOKENS.forEach(key => {
    if (dataset[key] != null) { tokens[key] = dataset[key] }
  })
  if (typeof symbol === 'string') { return tokens }
  // For object-form symbol, also merge token overrides from within the symbol object
  Object.entries(symbol).forEach(([k, v]) => {
    if (!SYMBOL_STRUCTURAL.has(k)) { tokens[k] = v }
  })
  return tokens
}

/**
 * Returns the viewBox string for a dataset's symbol.
 * Precedence: object-form config viewBox → symbolDef viewBox → default.
 *
 * @param {Object} dataset
 * @param {Object|undefined} symbolDef
 * @returns {string}
 */
export const getSymbolViewBox = (dataset, symbolDef) => {
  if (typeof dataset.symbol === 'object' && dataset.symbol.viewBox) {
    return dataset.symbol.viewBox
  }
  return symbolDef?.viewBox ?? '0 0 38 38'
}

/**
 * Returns the anchor for a dataset's symbol as [x, y] in 0–1 space.
 * Precedence: object-form config anchor → symbolDef anchor → [0.5, 0.5].
 *
 * @param {Object} dataset
 * @param {Object|undefined} symbolDef
 * @returns {number[]}
 */
export const getSymbolAnchor = (dataset, symbolDef) => {
  if (typeof dataset.symbol === 'object' && dataset.symbol.anchor) {
    return dataset.symbol.anchor
  }
  return symbolDef?.anchor ?? [0.5, 0.5]
}

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
 * Register normal and selected symbol images for all symbol datasets.
 * Skips images that are already registered (safe to call on style change).
 *
 * @param {Object} map - MapLibre map instance
 * @param {Object[]} datasets
 * @param {string} mapStyleId
 * @param {Object} symbolRegistry
 * @returns {Promise<void>}
 */
const getSymbolConfigs = (datasets) =>
  datasets.flatMap(dataset => {
    const configs = hasSymbol(dataset) ? [dataset] : []
    if (dataset.sublayers?.length) {
      dataset.sublayers.forEach(sublayer => {
        const merged = mergeSublayer(dataset, sublayer)
        if (hasSymbol(merged)) {
          configs.push(merged)
        }
      })
    }
    return configs
  })

export const registerSymbols = async (map, datasets, mapStyleId, symbolRegistry) => {
  const symbolConfigs = getSymbolConfigs(datasets)
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
