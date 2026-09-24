/**
 * Default token values applied to all symbols unless overridden at the constructor,
 * symbol registration, or marker creation level.
 * Colour values may be a plain string or a map-style-keyed object,
 * e.g. { outdoor: '#ffffff', dark: '#0b0c0c' }
 */
export const symbolDefaults = {
  symbol: 'pin',
  backgroundColor: '#ca3535',
  foregroundColor: '#ffffff'
}

/** Stroke width for the halo (background shape outline) in SVG units */
export const HALO_STROKE_WIDTH = 2

/** Stroke width for the selected state — symbol rings and feature highlight lines */
export const SELECTED_STROKE_WIDTH = 3

/** Stroke width for the active (keyboard cursor) state — double selected, extends 1× each side */
export const ACTIVE_STROKE_WIDTH = SELECTED_STROKE_WIDTH * 2

/**
 * Built-in graphic path data strings for use with the `graphic` token.
 *
 * Each value is an SVG `d` attribute string in a 16×16 coordinate space,
 * centred at (8, 8). The built-in symbols (`pin`, `circle`, `square`, `hexagon`, `triangle`, `diamond`) apply a
 * `translate` transform to position this 16×16 area correctly within their
 * viewBox — so graphic path data does not need to account for symbol
 * positioning.
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
// Symbols use a 44-wide viewBox (pin is 44×47 to fit its tail). SVG templates use {{token}} placeholders
// resolved at render time by the symbolRegistry.

export const pin = {
  id: 'pin',
  // Taller than wide: the head is a 44×40 area (r=13 body + selected/active rings) and the
  // tail extends below it. Anchor 0.9 (y=42.3) sits between the body tip and the ring tip.
  viewBox: '0 0 44 47',
  anchor: [0.5, 0.9], // NOSONAR
  graphic: graphics.dot,
  svg: `<path d="M22 43.499C18.153 43.499 13.175 37.235 11.101 34.633 8.209 31.004 5 24.978 5 20.002a17 17 0 0 1 17-17 17 17 0 0 1 17 17C39 24.978 35.791 31.004 32.899 34.633 30.825 37.236 25.847 43.499 22 43.499z" fill="{{selectedColor}}" stroke="{{activeColor}}" stroke-width="6" paint-order="stroke fill"/>
  <path d="M22 7a13 13 0 0 1 13 13C35 28.258 23.758 39.499 22 39.499S9 28.259 9 20.001a13 13 0 0 1 13-13z" fill="{{backgroundColor}}" stroke="{{haloColor}}" stroke-width="2" paint-order="stroke fill"/>
  <g transform="translate(22, 20) scale(0.8) translate(-8, -8)"><path d="{{graphic}}" fill="{{foregroundColor}}"/></g>`
}

export const circle = {
  id: 'circle',
  viewBox: '0 0 44 44',
  anchor: [0.5, 0.5],
  graphic: graphics.dot,
  svg: `<circle cx="22" cy="22" r="17" fill="{{selectedColor}}" stroke="{{activeColor}}" stroke-width="6" paint-order="stroke fill"/>
  <circle cx="22" cy="22" r="13" fill="{{backgroundColor}}" stroke="{{haloColor}}" stroke-width="2" paint-order="stroke fill"/>
  <g transform="translate(22, 22) scale(0.8) translate(-8, -8)"><path d="{{graphic}}" fill="{{foregroundColor}}"/></g>`
}

// 23.6 body with 3px corner radii — ~103% of circle's area, Material's square-to-circle keyline
// ratio (18×18 square vs 20 circle).
export const square = {
  id: 'square',
  viewBox: '0 0 44 44',
  anchor: [0.5, 0.5],
  graphic: graphics.dot,
  svg: `<path d="M13.2 6.2h17.6c3.863 0 7 3.137 7 7v17.6c0 3.863-3.137 7-7 7H13.2c-3.863 0-7-3.137-7-7V13.2c0-3.863 3.137-7 7-7" fill="{{selectedColor}}" stroke="{{activeColor}}" stroke-width="6" paint-order="stroke fill"/>
  <path d="M13.2 33.8a3 3 0 0 1-3-3V13.2a3 3 0 0 1 3-3h17.6a3 3 0 0 1 3 3v17.6a3 3 0 0 1-3 3H13.2z" fill-rule="nonzero" fill="{{backgroundColor}}" stroke="{{haloColor}}" stroke-width="2" paint-order="stroke fill"/>
  <g transform="translate(22, 22) scale(0.8) translate(-8, -8)"><path d="{{graphic}}" fill="{{foregroundColor}}"/></g>`
}

// Pointy-top hexagon with flat sides 12.6 from the centre and 3px corner radii (matching
// square's) — ~3% more area than circle's r=13 body, between circle and square (cornered
// shapes need slightly more area than a circle to read as the same size). Its rounded points reach ~14.1, so the
// active ring ends ~0.9px inside the viewBox. Unlike the other symbols the rings are strokes on
// the body outline itself rather than a separate outer shape: a stroke is an exact offset, so
// the rings stay a true 3px around the corners. Widths are each ring's outer edge × 2
// (halo 1 + selected 3 = 4 → 8; + active 3 = 7 → 14).
const HEXAGON_PATH = 'M23.5 8.317L33.1 13.859A3 3 0 0 1 34.6 16.457L34.6 27.543A3 3 0 0 1 33.1 30.141L23.5 35.683A3 3 0 0 1 20.5 35.683L10.9 30.141A3 3 0 0 1 9.4 27.543L9.4 16.457A3 3 0 0 1 10.9 13.859L20.5 8.317A3 3 0 0 1 23.5 8.317z'

export const hexagon = {
  id: 'hexagon',
  viewBox: '0 0 44 44',
  anchor: [0.5, 0.5],
  graphic: graphics.dot,
  svg: `<path d="${HEXAGON_PATH}" fill="none" stroke="{{activeColor}}" stroke-width="14" stroke-linejoin="round"/>
  <path d="${HEXAGON_PATH}" fill="none" stroke="{{selectedColor}}" stroke-width="8" stroke-linejoin="round"/>
  <path d="${HEXAGON_PATH}" fill="{{backgroundColor}}" stroke="{{haloColor}}" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill"/>
  <g transform="translate(22, 22) scale(0.8) translate(-8, -8)"><path d="{{graphic}}" fill="{{foregroundColor}}"/></g>`
}

// Point-up equilateral triangle with 3px corner radii (matching square and hexagon), edges 10.4
// from the centroid — ~102% of circle's area. Even so its rings make it ~45.6 wide, hence the
// 46×44 viewBox. The centroid sits at (23, 26) and is the anchor. The graphic sits 0.5 below
// the centroid. Rings are strokes on the body outline, as on hexagon.
const TRIANGLE_PATH = 'M25.598 9.7L38.415 31.9A3 3 0 0 1 35.817 36.4L10.183 36.4A3 3 0 0 1 7.585 31.9L20.402 9.7A3 3 0 0 1 25.598 9.7z'

export const triangle = {
  id: 'triangle',
  viewBox: '0 0 46 44',
  anchor: [0.5, 26 / 44], // NOSONAR — centroid y ÷ viewBox height
  graphic: graphics.dot,
  svg: `<path d="${TRIANGLE_PATH}" fill="none" stroke="{{activeColor}}" stroke-width="14" stroke-linejoin="round"/>
  <path d="${TRIANGLE_PATH}" fill="none" stroke="{{selectedColor}}" stroke-width="8" stroke-linejoin="round"/>
  <path d="${TRIANGLE_PATH}" fill="{{backgroundColor}}" stroke="{{haloColor}}" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill"/>
  <g transform="translate(23, 26.5) scale(0.8) translate(-8, -8)"><path d="{{graphic}}" fill="{{foregroundColor}}"/></g>`
}

// A square rotated 45°, with 3px corner radii like square — edges 11.6 from the centre, the
// same area as circle's r=13 body (less than square's, since its points reach further and make
// it read larger). The points and rings reach ~22.2 from the centre, hence the 46×46 viewBox,
// centred at (23, 23). Rings are strokes on the body outline, as on hexagon.
const DIAMOND_PATH = 'M25.121 8.716L37.284 20.879A3 3 0 0 1 37.284 25.121L25.121 37.284A3 3 0 0 1 20.879 37.284L8.716 25.121A3 3 0 0 1 8.716 20.879L20.879 8.716A3 3 0 0 1 25.121 8.716z'

export const diamond = {
  id: 'diamond',
  viewBox: '0 0 46 46',
  anchor: [0.5, 0.5],
  graphic: graphics.dot,
  svg: `<path d="${DIAMOND_PATH}" fill="none" stroke="{{activeColor}}" stroke-width="14" stroke-linejoin="round"/>
  <path d="${DIAMOND_PATH}" fill="none" stroke="{{selectedColor}}" stroke-width="8" stroke-linejoin="round"/>
  <path d="${DIAMOND_PATH}" fill="{{backgroundColor}}" stroke="{{haloColor}}" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill"/>
  <g transform="translate(23, 23) scale(0.8) translate(-8, -8)"><path d="{{graphic}}" fill="{{foregroundColor}}"/></g>`
}
