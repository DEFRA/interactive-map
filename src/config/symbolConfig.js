/**
 * Default token values applied to all symbols unless overridden at the constructor,
 * symbol registration, or marker creation level.
 * Colour values may be a plain string or a map-style-keyed object,
 * e.g. { outdoor: '#ffffff', dark: '#0b0c0c' }
 */
export const symbolDefaults = {
  symbol: 'pin',
  symbolSize: 'medium',
  backgroundColor: '#ca3535',
  foregroundColor: '#ffffff'
}

/**
 * Scale factor for each `symbolSize`. Scales a symbol's shape and graphic; the halo and the
 * selected/active rings stay a fixed width at every size (see getSymbolScale in symbolUtils.js).
 */
export const SYMBOL_SIZES = {
  small: 0.75, // NOSONAR
  medium: 1,
  large: 1.25 // NOSONAR
}

/** Stroke width for the halo (background shape outline) in SVG units */
export const HALO_STROKE_WIDTH = 2

/** Stroke width for the selected state — symbol rings and feature highlight lines */
export const SELECTED_STROKE_WIDTH = 3

/** Stroke width for the active (keyboard cursor) state — double selected, extends 1× each side */
export const ACTIVE_STROKE_WIDTH = SELECTED_STROKE_WIDTH * 2

// Built-in symbols draw their halo and rings as strokes centred on the body outline, so each
// stroke is twice the distance its visible edge reaches beyond the body: halo 1, selected ring
// 1 + 3 = 4, active ring 4 + 3 = 7. A stroke is an exact offset, so rings stay even round corners.
export const SELECTED_RING_STROKE_WIDTH = HALO_STROKE_WIDTH + SELECTED_STROKE_WIDTH * 2 // NOSONAR
export const ACTIVE_RING_STROKE_WIDTH = SELECTED_RING_STROKE_WIDTH + ACTIVE_STROKE_WIDTH

/** Space around a built-in symbol's body: its outermost (active) ring plus 1px clearance */
export const SYMBOL_PADDING = ACTIVE_RING_STROKE_WIDTH / 2 + 1 // NOSONAR

/**
 * Built-in graphic path data strings for use with the `graphic` token.
 *
 * Each value is an SVG `d` attribute string in a 16×16 coordinate space,
 * centred at (8, 8). The built-in symbols (`pin`, `circle`, `square`, `hexagon`, `triangle`, `diamond`)
 * centre this 16×16 area on their `graphicCentre` at 0.8 scale — so graphic path data does not
 * need to account for symbol positioning or size.
 *
 * @example
 * markers.add('id', coords, { symbol: 'pin', graphic: graphics.dot })
 *
 * @example
 * // Inline path data (16×16 space, centred at 8,8)
 * markers.add('id', coords, { symbol: 'pin', graphic: 'M3 8 L8 3 L13 8 L8 13 Z' })
 */
export const graphics = {
  /** Small filled circle — the default graphic for built-in symbols */
  dot: 'M8 3c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.241 5-5-2.24-5-5-5z',

  /** Filled plus / cross shape */
  cross: 'M6 3H10V6H13V10H10V13H6V10H3V6H6Z',

  /** Filled diamond / rotated square */
  diamond: 'M8 2L14 8L8 14L2 8Z',

  /** Filled upward-pointing triangle */
  triangle: 'M8 2L14 14H2Z',

  /** Filled square */
  square: 'M3 3H13V13H3Z'
}

// ─── Built-in symbol definitions ─────────────────────────────────────────────
// ─── Built-in symbol definitions ─────────────────────────────────────────────
// Each is a single body `path` in its own coordinates, with:
//   bounds        [x, y, width, height] — the body path's tight bounding box
//   anchorPoint   [x, y] — the point that sits on the map coordinate
//   graphicCentre [x, y] — where the 16×16 graphic is centred (drawn at 0.8 scale)
// symbolRegistry composes the rendered SVG, viewBox and fractional anchor from these for each
// symbolSize: the body and graphic scale, the halo and rings don't.

// Circle-headed pin, head r=13. The anchor sits 2.8 below the body tip — between the halo edge
// and the selected ring's tip.
export const pin = {
  id: 'pin',
  path: 'M22 7a13 13 0 0 1 13 13C35 28.258 23.758 39.499 22 39.499S9 28.259 9 20.001a13 13 0 0 1 13-13z',
  bounds: [9, 7, 26, 32.499], // NOSONAR
  anchorPoint: [22, 42.3], // NOSONAR
  graphicCentre: [22, 20], // NOSONAR
  graphic: graphics.dot
}

// r=13 — the reference size the other shapes' areas are compared against.
export const circle = {
  id: 'circle',
  path: 'M22 9a13 13 0 1 1 0 26 13 13 0 1 1 0-26z',
  bounds: [9, 9, 26, 26], // NOSONAR
  anchorPoint: [22, 22], // NOSONAR
  graphicCentre: [22, 22], // NOSONAR
  graphic: graphics.dot
}

// 23.6 body with 3px corner radii — ~103% of circle's area, Material's square-to-circle keyline
// ratio (18×18 square vs 20 circle).
export const square = {
  id: 'square',
  path: 'M13.2 33.8a3 3 0 0 1-3-3V13.2a3 3 0 0 1 3-3h17.6a3 3 0 0 1 3 3v17.6a3 3 0 0 1-3 3H13.2z',
  bounds: [10.2, 10.2, 23.6, 23.6], // NOSONAR
  anchorPoint: [22, 22], // NOSONAR
  graphicCentre: [22, 22], // NOSONAR
  graphic: graphics.dot
}

// Pointy-top hexagon, flat sides 12.6 from the centre, 3px corner radii — ~103% of circle's
// area, between circle and square (cornered shapes need slightly more area than a circle to
// read as the same size).
export const hexagon = {
  id: 'hexagon',
  path: 'M23.5 8.317L33.1 13.859A3 3 0 0 1 34.6 16.457L34.6 27.543A3 3 0 0 1 33.1 30.141L23.5 35.683A3 3 0 0 1 20.5 35.683L10.9 30.141A3 3 0 0 1 9.4 27.543L9.4 16.457A3 3 0 0 1 10.9 13.859L20.5 8.317A3 3 0 0 1 23.5 8.317z',
  bounds: [9.4, 7.915, 25.2, 28.17], // NOSONAR
  anchorPoint: [22, 22], // NOSONAR
  graphicCentre: [22, 22], // NOSONAR
  graphic: graphics.dot
}

// Point-up equilateral triangle, edges 10.4 from the centroid, 3px corner radii — ~102% of
// circle's area. Anchored at the centroid; the graphic sits 0.5 below it.
export const triangle = {
  id: 'triangle',
  path: 'M25.598 9.7L38.415 31.9A3 3 0 0 1 35.817 36.4L10.183 36.4A3 3 0 0 1 7.585 31.9L20.402 9.7A3 3 0 0 1 25.598 9.7z',
  bounds: [7.183, 8.2, 31.634, 28.2], // NOSONAR
  anchorPoint: [23, 26], // NOSONAR
  graphicCentre: [23, 26.5], // NOSONAR
  graphic: graphics.dot
}

// A square rotated 45°, edges 11.6 from the centre, 3px corner radii — the same area as circle
// (less than square's, since its points reach further and make it read larger).
export const diamond = {
  id: 'diamond',
  path: 'M25.121 8.716L37.284 20.879A3 3 0 0 1 37.284 25.121L25.121 37.284A3 3 0 0 1 20.879 37.284L8.716 25.121A3 3 0 0 1 8.716 20.879L20.879 8.716A3 3 0 0 1 25.121 8.716z',
  bounds: [7.838, 7.838, 30.324, 30.324], // NOSONAR
  anchorPoint: [23, 23], // NOSONAR
  graphicCentre: [23, 23], // NOSONAR
  graphic: graphics.dot
}
