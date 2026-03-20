import { getValueForStyle } from '../../../../../src/utils/getValueForStyle.js'

// ─── Built-in pattern library ────────────────────────────────────────────────
// Each value is the inner SVG content (paths only, no wrapper).
// Paths are authored in a 16×16 coordinate space (power-of-two, tiles seamlessly).
// Use {{foreground}} and {{background}} tokens for colours.

const BUILT_IN_PATTERNS = {
  'cross-hatch': '<path d="M0 4.486V3.485h3.5V.001h1v3.484h7.002V.001h1v3.484h3.5v1.001h-3.5v7h3.5v.999h-3.5v3.516h-1v-3.516H4.499v3.516h-1v-3.516H0v-.999h3.5v-7H0zm11.501 0H4.499v7h7.002v-7z" fill="{{foreground}}"/>',
  'diagonal-cross-hatch': '<path d="M0 8.707V7.293L7.293 0h1.414L16 7.293v1.414L8.707 16H7.293L0 8.707zM.707 8L8 15.293 15.293 8 8 .707.707 8z" fill="{{foreground}}"/>',
  'forward-diagonal-hatch': '<path d="M16 8.707V7.293L7.293 16h1.414L16 8.707zm-16 0L8.707 0H7.293L0 7.293v1.414z" fill="{{foreground}}"/>',
  'backward-diagonal-hatch': '<path d="M0 8.707V7.293L8.707 16H7.293L0 8.707zm16 0L7.293 0h1.414L16 7.293v1.414z" fill="{{foreground}}"/>',
  'horizontal-hatch': '<path d="M0 4.5V3.499h15.999V4.5H0zm0 7h15.999V12.5H0v-1.001z" fill="{{foreground}}"/>',
  'vertical-hatch': '<path d="M3.501 16.001V0h1v16.001h-1zm7.998 0V0h1v16.001h-1z" fill="{{foreground}}"/>',
  'dot': '<path d="M3.999 2A2 2 0 0 1 6 3.999C6 5.103 5.103 6 3.999 6a2 2 0 0 1-1.999-2.001A2 2 0 0 1 3.999 2zm0 7.999C5.103 10 6 10.897 6 12.001A2 2 0 0 1 3.999 14a2 2 0 0 1-1.999-1.999A2 2 0 0 1 3.999 10zM11.999 2A2 2 0 0 1 14 3.999C14 5.103 13.103 6 11.999 6S10 5.103 10 3.999A2 2 0 0 1 11.999 2zm0 7.999c1.104 0 2.001.897 2.001 2.001A2 2 0 0 1 11.999 14 2 2 0 0 1 10 12.001c0-1.104.897-2.001 1.999-2.001z" fill="{{foreground}}"/>',
  'diamond': '<path d="M4 .465L7.535 4 4 7.535.465 4 4 .465zm0 7.999l3.535 3.535L4 15.535.465 11.999 4 8.464zm8-8l3.535 3.535-3.536 3.536L8.464 4 12 .464zm0 8.001L15.536 12 12 15.536 8.465 12 12 8.465z" fill="{{foreground}}"/>'
}

// Plugin-controlled border path used in the key symbol (20×20 coordinate space).
// This is always rendered as the first element, before the user-supplied content.
const KEY_BORDER_PATH = '<path d="M19 2.862v14.275c0 1.028-.835 1.862-1.862 1.862H2.863c-1.028 0-1.862-.835-1.862-1.862V2.862C1.001 1.834 1.836 1 2.863 1h14.275C18.166 1 19 1.835 19 2.862z" fill="{{background}}" stroke="{{foreground}}" stroke-width="2"/>'

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const hashString = (str) => {
  let hash = 0
  for (const ch of str) {
    hash = ((hash << 5) - hash) + ch.codePointAt(0)
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

export const injectColors = (content, foreground, background) =>
  content
    .replace(/\{\{foreground\}\}/g, foreground || 'black')
    .replace(/\{\{background\}\}/g, background || 'transparent')

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns true if a dataset has a fill pattern configured.
 * @param {Object} dataset
 * @returns {boolean}
 */
export const hasPattern = (dataset) => !!(dataset.fillPattern || dataset.fillPatternSvgContent)

/**
 * Returns the raw (un-coloured) inner SVG content for a dataset's pattern.
 * Custom fillPatternSvgContent takes precedence over built-in fillPattern ids.
 * @param {Object} dataset
 * @returns {string|null}
 */
export const getPatternInnerContent = (dataset) => {
  if (dataset.fillPatternSvgContent) return dataset.fillPatternSvgContent
  if (dataset.fillPattern && BUILT_IN_PATTERNS[dataset.fillPattern]) {
    return BUILT_IN_PATTERNS[dataset.fillPattern]
  }
  return null
}

/**
 * Returns a deterministic image ID for a pattern + resolved colour combination.
 * @param {Object} dataset
 * @param {string} mapStyleId
 * @returns {string|null}
 */
export const getPatternImageId = (dataset, mapStyleId) => {
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
 * @returns {{ border: string, content: string }|null}
 */
export const getKeyPatternPaths = (dataset, mapStyleId) => {
  const innerContent = getPatternInnerContent(dataset)
  if (!innerContent) return null
  const fg = getValueForStyle(dataset.fillPatternForegroundColor, mapStyleId) || 'black'
  const bg = getValueForStyle(dataset.fillPatternBackgroundColor, mapStyleId) || 'transparent'
  const borderStroke = getValueForStyle(dataset.stroke, mapStyleId) || fg
  return {
    border: injectColors(KEY_BORDER_PATH, borderStroke, bg),
    content: injectColors(innerContent, fg, bg)
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
 * Rasterises a dataset's pattern SVG to ImageData, using an in-memory cache
 * to avoid re-rasterising identical patterns. Framework-agnostic — callers
 * are responsible for registering the result with their map framework.
 *
 * @param {Object} dataset
 * @param {string} mapStyleId
 * @returns {Promise<{ imageId: string, imageData: ImageData }|null>}
 */
export const rasterisePattern = async (dataset, mapStyleId) => {
  const innerContent = getPatternInnerContent(dataset)
  if (!innerContent) return null

  const fg = getValueForStyle(dataset.fillPatternForegroundColor, mapStyleId) || 'black'
  const bg = getValueForStyle(dataset.fillPatternBackgroundColor, mapStyleId) || 'transparent'
  const imageId = `pattern-${hashString(innerContent + fg + bg)}`

  let imageData = imageDataCache.get(imageId)
  if (!imageData) {
    const colored = injectColors(innerContent, fg, bg)
    const bgRect = `<rect width="16" height="16" fill="${bg}"/>`
    // pixelRatio: 2 means the map treats this as an 8×8 logical tile — crisp on retina screens.
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">${bgRect}${colored}</svg>`
    imageData = await rasteriseToImageData(svgString, 16, 16)
    imageDataCache.set(imageId, imageData)
  }

  return { imageId, imageData }
}
