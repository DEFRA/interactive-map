import {
  HALO_STROKE_WIDTH, SELECTED_RING_STROKE_WIDTH, ACTIVE_RING_STROKE_WIDTH, SYMBOL_PADDING, DEFAULT_SYMBOL_ANCHOR
} from '../config/symbolConfig.js'
import { getPathBounds } from '../utils/pathBounds.js'
import { logger } from './logger.js'

// Pure geometry and SVG building for symbols — no registry state. symbolRegistry resolves which
// definition and token values apply; this turns them into a sized definition and SVG markup.

const GRAPHIC_SIZE = 16 // graphics are authored in a 16×16 space...
const GRAPHIC_SCALE = 0.8 // ...and drawn at 0.8 of that, centred on the shape's graphicCentre
const PRECISION = 1000 // 3dp: sub-pixel precision for SVG attributes
const HALF = 0.5
const BOTH_SIDES = 2
// Built-in viewBoxes are rounded up to a multiple of this, so viewBox × pixel ratio is a whole
// number of pixels at every common ratio (device 1, 1.25, 1.5, 2 × map size 1, 1.5, 2 — all but
// 1.875). A fractional size would be truncated when rasterised, squashing the image slightly
// and shifting its anchor.
const SIZE_STEP = 4
const roundUpToStep = (value) => Math.ceil(value / SIZE_STEP) * SIZE_STEP
const round3 = (value) => Math.round(value * PRECISION) / PRECISION

// Each invalid symbolAnchor is reported once, rather than on every render
const reportedAnchors = new Set()
const ANCHOR_LENGTH = 2
const isValidAnchor = (anchor) => Array.isArray(anchor) && anchor.length === ANCHOR_LENGTH && anchor.every(Number.isFinite)

// Built-in (path-based) shapes, composed per scale: symbolDef → Map(scale → sized def)
const composedCache = new WeakMap()

/**
 * Sizes a path-based built-in shape. The body and graphic scale; the halo and rings are drawn
 * as strokes at a fixed width (see renderComposed), so the viewBox is the scaled body plus a
 * fixed SYMBOL_PADDING, rounded up to a SIZE_STEP so rasterised images have exact dimensions.
 *
 * @param {Object} symbolDef - { path, bounds, anchorPoint, graphicCentre, ... }
 * @param {number} scale
 * @returns {Object} the def plus scale, viewBox, anchor (fractional), bodyBox and transform
 */
export const composeSymbolDef = (symbolDef, scale) => {
  let byScale = composedCache.get(symbolDef)
  if (!byScale) {
    byScale = new Map()
    composedCache.set(symbolDef, byScale)
  }
  if (byScale.has(scale)) {
    return byScale.get(scale)
  }
  const [boundsX, boundsY, boundsWidth, boundsHeight] = symbolDef.bounds
  const width = roundUpToStep(boundsWidth * scale + SYMBOL_PADDING * BOTH_SIDES)
  const height = roundUpToStep(boundsHeight * scale + SYMBOL_PADDING * BOTH_SIDES)
  const offsetX = (width - boundsWidth * scale) * HALF
  const offsetY = (height - boundsHeight * scale) * HALF
  const [anchorX, anchorY] = symbolDef.anchorPoint
  const sized = {
    ...symbolDef,
    scale,
    viewBox: `0 0 ${width} ${height}`,
    anchor: [((anchorX - boundsX) * scale + offsetX) / width, ((anchorY - boundsY) * scale + offsetY) / height],
    // The body's own box within the viewBox — what a symbolAnchor override is a fraction of
    bodyBox: [offsetX, offsetY, boundsWidth * scale, boundsHeight * scale],
    transform: `translate(${round3(offsetX)}, ${round3(offsetY)}) scale(${scale}) translate(${-boundsX}, ${-boundsY})`
  }
  byScale.set(scale, sized)
  return sized
}

/**
 * Applies a symbolAnchor override to a sized def. For a built-in shape the override is a
 * fraction of the shape itself ([0.5, 1] = its bottom edge), so it stays on the same point of the
 * shape at every size; for an SVG-template symbol it's a fraction of its own viewBox. An invalid
 * override is warned about (once) and ignored, keeping the symbol's own anchor.
 *
 * @param {Object} sizedDef
 * @param {number[]} [anchor] - [x, y] in 0–1
 * @returns {Object}
 */
export const applyAnchorOverride = (sizedDef, anchor) => {
  if (!anchor) {
    return sizedDef
  }
  if (!isValidAnchor(anchor)) {
    const reportKey = JSON.stringify(anchor)
    if (!reportedAnchors.has(reportKey)) {
      reportedAnchors.add(reportKey)
      logger.warn(`Invalid symbolAnchor ${reportKey} — expected [x, y] numbers. Using the symbol's own anchor.`)
    }
    return sizedDef
  }
  if (!sizedDef.bodyBox) {
    return { ...sizedDef, anchor }
  }
  const [bodyX, bodyY, bodyWidth, bodyHeight] = sizedDef.bodyBox
  const [,, width, height] = sizedDef.viewBox.split(' ').map(Number)
  return { ...sizedDef, anchor: [(bodyX + anchor[0] * bodyWidth) / width, (bodyY + anchor[1] * bodyHeight) / height] }
}

/**
 * Sizes an SVG-template symbol (a custom symbol, or symbolSvgContent) by scaling it as a whole —
 * its own rings, if it draws any, scale with it. A symbol with no anchor of its own is centred.
 *
 * @param {Object} symbolDef - { svg, anchor?, ... }
 * @param {string} viewBox
 * @param {number} scale
 * @returns {Object}
 */
export const scaleSvgSymbolDef = (symbolDef, viewBox, scale) => {
  const anchored = { anchor: DEFAULT_SYMBOL_ANCHOR, ...symbolDef }
  if (scale === 1) {
    return { ...anchored, viewBox }
  }
  const scaledViewBox = viewBox.split(' ').map((value) => round3(Number(value) * scale)).join(' ')
  return { ...anchored, viewBox: scaledViewBox, svg: `<g transform="scale(${scale})">${symbolDef.svg}</g>` }
}

// graphic path → transform that centres it and, if bigger than 16×16, shrinks it to fit
const graphicFitCache = new Map()

/**
 * Transform for a graphic, placing it on the shape's graphic centre. The graphic's own bounds are centred there
 * and it's shrunk (never enlarged) to fit the 16×16 graphic area — so an icon drawn in any
 * coordinate space (e.g. a 24×24 Material icon) still sits centred inside the shape. A graphic
 * that can't be measured falls back to the 16×16 space's own centre.
 *
 * @param {string} graphic - SVG path data
 * @param {number} centreX - the shape's graphic centre
 * @param {number} centreY
 * @returns {string}
 */
export const getGraphicTransform = (graphic, centreX, centreY) => {
  if (!graphicFitCache.has(graphic)) {
    let fit = { scale: 1, graphicCentreX: GRAPHIC_SIZE * HALF, graphicCentreY: GRAPHIC_SIZE * HALF }
    if (graphic) {
      try {
        const [graphicX, graphicY, graphicWidth, graphicHeight] = getPathBounds(graphic)
        fit = {
          scale: Math.min(1, GRAPHIC_SIZE / Math.max(graphicWidth, graphicHeight, Number.EPSILON)),
          graphicCentreX: graphicX + graphicWidth * HALF,
          graphicCentreY: graphicY + graphicHeight * HALF
        }
      } catch (error) {
        logger.warn(`Symbol graphic could not be measured, so it isn't centred — ${error.message}`)
      }
    }
    graphicFitCache.set(graphic, fit)
  }
  const { scale, graphicCentreX, graphicCentreY } = graphicFitCache.get(graphic)
  return `translate(${centreX}, ${centreY}) scale(${round3(GRAPHIC_SCALE * scale)}) translate(${round3(-graphicCentreX)}, ${round3(-graphicCentreY)})`
}

const hasColor = (color) => !!color && color !== 'none'

/**
 * SVG markup for a sized built-in shape. Rings are only emitted when shown, so an unselected
 * symbol is a single path plus its graphic.
 *
 * @param {Object} sizedDef - from composeSymbolDef
 * @param {Object} values - resolved tokens (backgroundColor, foregroundColor, haloColor, selectedColor, activeColor, graphic)
 * @returns {string}
 */
export const renderComposed = (sizedDef, values) => {
  const { path, scale, transform, graphicCentre: [centreX, centreY] } = sizedDef
  const ring = (color, strokeWidth) =>
    `<path d="${path}" fill="none" stroke="${color}" stroke-width="${round3(strokeWidth / scale)}" stroke-linejoin="round"/>`
  const layers = [
    hasColor(values.activeColor) ? ring(values.activeColor, ACTIVE_RING_STROKE_WIDTH) : '',
    hasColor(values.selectedColor) ? ring(values.selectedColor, SELECTED_RING_STROKE_WIDTH) : '',
    `<path d="${path}" fill="${values.backgroundColor}" stroke="${values.haloColor}" stroke-width="${round3(HALO_STROKE_WIDTH / scale)}" stroke-linejoin="round" paint-order="stroke fill"/>`,
    `<g transform="${getGraphicTransform(values.graphic, centreX, centreY)}"><path d="${values.graphic}" fill="${values.foregroundColor}"/></g>`
  ]
  return `<g transform="${transform}">${layers.join('')}</g>`
}

/**
 * Substitutes {{token}} placeholders in an SVG template.
 *
 * @param {string} svgString
 * @param {Object} values
 * @returns {string}
 */
export const renderTemplate = (svgString, values) => Object.entries(values).reduce(
  (svg, [token, value]) => svg.replaceAll(`{{${token}}}`, value),
  svgString
)
