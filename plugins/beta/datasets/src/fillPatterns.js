import { getValueForStyle } from '../../../../src/utils/getValueForStyle.js'

// ─── Built-in pattern library ────────────────────────────────────────────────
// Each value is the inner SVG content (paths only, no wrapper).
// Paths are authored in a 16×16 coordinate space (power-of-two, tiles seamlessly).
// Use {{foreground}} and {{background}} tokens for colours.

const BUILT_IN_PATTERNS = {
  crosshatch: '<path d="M0 8.707V7.293L7.293 0h1.414L16 7.293v1.414L8.707 16H7.293L0 8.707zM.707 8L8 15.293 15.293 8 8 .707.707 8z" fill="{{foreground}}" />',
  dots: '<path d="M4 2a2 2 0 1 1 0 4 2 2 0 1 1 0-4zm0 8a2 2 0 1 1 0 4 2 2 0 1 1 0-4zm8-8a2 2 0 1 1 0 4 2 2 0 1 1 0-4zm0 8a2 2 0 1 1 0 4 2 2 0 1 1 0-4z" fill="{{foreground}}" />',
  diagonal: '<path d="M0 8.707V7.293L8.707 16H7.293L0 8.707zm16 0L7.293 0h1.414L16 7.293v1.414z" fill="{{foreground}}" />'
}

// Plugin-controlled border path used in the key symbol (20×20 coordinate space).
// This is always rendered as the first element, before the user-supplied content.
const KEY_BORDER_PATH = '<path d="M19 2.862v14.275c0 1.028-.835 1.862-1.862 1.862H2.863c-1.028 0-1.862-.835-1.862-1.862V2.862C1.001 1.834 1.836 1 2.863 1h14.275C18.166 1 19 1.835 19 2.862z" fill="{{background}}" stroke="{{foreground}}" stroke-width="2"/>'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const hashString = (str) => {
  let hash = 0
  for (const ch of str) {
    hash = ((hash << 5) - hash) + ch.codePointAt(0)
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

const injectColors = (content, foreground, background) =>
  content
    .replace(/\{\{foreground\}\}/g, foreground || 'black')
    .replace(/\{\{background\}\}/g, background || 'transparent')

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns true if a dataset has a fill pattern configured.
 * @param {Object} dataset
 * @returns {boolean}
 */
const hasPattern = (dataset) => !!(dataset.fillPattern || dataset.fillPatternSvgContent)

/**
 * Returns the raw (un-coloured) inner SVG content for a dataset's pattern.
 * Custom fillPatternSvgContent takes precedence over built-in fillPattern ids.
 * @param {Object} dataset
 * @returns {string|null}
 */
const getPatternInnerContent = (dataset) => {
  if (dataset.fillPatternSvgContent) return dataset.fillPatternSvgContent
  if (dataset.fillPattern && BUILT_IN_PATTERNS[dataset.fillPattern]) {
    return BUILT_IN_PATTERNS[dataset.fillPattern]
  }
  return null
}

/**
 * Returns a deterministic MapLibre image ID for a pattern + resolved colour combination.
 * @param {Object} dataset
 * @param {string} mapStyleId
 * @returns {string|null}
 */
const getPatternImageId = (dataset, mapStyleId) => {
  const innerContent = getPatternInnerContent(dataset)
  if (!innerContent) return null
  const fg = getValueForStyle(dataset.fillPatternForegroundColor, mapStyleId) || 'black'
  const bg = getValueForStyle(dataset.fillPatternBackgroundColor, mapStyleId) || 'transparent'
  return `pattern-${hashString(innerContent + fg + bg)}`
}

/**
 * Returns colour-injected inner SVG path content for use in the Key symbol.
 * The caller is responsible for wrapping this in the SVG element and border path.
 * @param {Object} dataset
 * @param {string} mapStyleId
 * @returns {string|null}
 */
const getKeyPatternPaths = (dataset, mapStyleId) => {
  const innerContent = getPatternInnerContent(dataset)
  if (!innerContent) { return null }
  const fg = getValueForStyle(dataset.fillPatternForegroundColor, mapStyleId) || 'black'
  const bg = getValueForStyle(dataset.fillPatternBackgroundColor, mapStyleId) || 'transparent'
  const borderStroke = getValueForStyle(dataset.stroke, mapStyleId) || fg
  return {
    border: injectColors(KEY_BORDER_PATH, borderStroke, bg),
    content: injectColors(innerContent, fg, bg),
  }
}

// ─── Rasterisation ────────────────────────────────────────────────────────────

// Module-level cache: imageId → ImageData. Avoids re-rasterising identical patterns.
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
      reject(new Error(`Failed to rasterise pattern SVG: ${svgString.slice(0, 80)}`))
    }
    img.src = url
  })

/**
 * Pre-generates and registers all pattern images needed by the given datasets
 * for the current map style. Safe to call multiple times — skips already-registered
 * images and uses an in-memory cache to avoid re-rasterising identical patterns.
 *
 * Must be called (and awaited) before addMapLayers for any dataset with a fill pattern.
 *
 * @param {Object} map - MapLibre map instance
 * @param {Object[]} datasets - All datasets
 * @param {string} mapStyleId - Current map style ID
 * @returns {Promise<void>}
 */
const registerPatternImages = async (map, datasets, mapStyleId) => {
  const patternDatasets = datasets.filter(hasPattern)
  if (!patternDatasets.length) return

  await Promise.all(patternDatasets.map(async (dataset) => {
    const innerContent = getPatternInnerContent(dataset)
    if (!innerContent) return

    const fg = getValueForStyle(dataset.fillPatternForegroundColor, mapStyleId) || 'black'
    const bg = getValueForStyle(dataset.fillPatternBackgroundColor, mapStyleId) || 'transparent'
    const imageId = `pattern-${hashString(innerContent + fg + bg)}`

    // Already registered on this map instance (e.g. another dataset sharing the same pattern)
    if (map.hasImage(imageId)) return

    // Rasterise or retrieve from module cache
    let imageData = imageDataCache.get(imageId)
    if (!imageData) {
      const colored = injectColors(innerContent, fg, bg)
      const bgRect = `<rect width="16" height="16" fill="${bg}"/>`
      // pixelRatio: 2 means MapLibre treats this as an 8×8 logical tile — crisp on retina screens.
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">${bgRect}${colored}</svg>`
      imageData = await rasteriseToImageData(svgString, 16, 16)
      imageDataCache.set(imageId, imageData)
    }

    map.addImage(imageId, imageData, { pixelRatio: 2 })
  }))
}

export {
  hasPattern,
  getPatternInnerContent,
  getPatternImageId,
  getKeyPatternPaths,
  registerPatternImages
}
