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

/** Stroke width of the ring layer (selection + active rings) in SVG units */
export const RING_WIDTH = 6

/** Stroke width of the halo (background shape outline) in SVG units */
export const HALO_WIDTH = 2

/**
 * Built-in graphic path data strings for use with the `graphic` token.
 *
 * Each value is an SVG `d` attribute string in a 16×16 coordinate space,
 * centred at (8, 8). The built-in symbols (`pin`, `circle`, `square`) apply a
 * `translate` transform to position this 16×16 area correctly within their
 * 38×38 viewBox — so graphic path data does not need to account for symbol
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
// Each symbol uses a 44×44 viewBox. SVG templates use {{token}} placeholders
// resolved at render time by the symbolRegistry.

export const pin = {
  id: 'pin',
  viewBox: '0 0 44 44',
  anchor: [0.5, 0.9], // NOSONAR
  graphic: graphics.dot,
  svg: `<path d="M22 40.999c-3.621 0-8.306-5.864-10.258-8.3C9.02 29.302 6 23.66 6 19.002a16.01 16.01 0 0 1 16-16 16.01 16.01 0 0 1 16 16c0 4.658-3.02 10.3-5.742 13.697-1.952 2.437-6.637 8.3-10.258 8.3z" fill="{{selectedColor}}" stroke="{{activeColor}}" stroke-width="6" paint-order="stroke fill"/>
  <path d="M22 7.001a12.01 12.01 0 0 1 12 12c0 7.623-10.377 17.998-12 17.998S10 26.624 10 19.001a12.01 12.01 0 0 1 12-12z" fill="{{backgroundColor}}" stroke="{{haloColor}}" stroke-width="2" paint-order="stroke fill"/>
  <g transform="translate(22, 19) scale(0.8) translate(-8, -8)"><path d="{{graphic}}" fill="{{foregroundColor}}"/></g>`
}

export const circle = {
  id: 'circle',
  viewBox: '0 0 44 44',
  anchor: [0.5, 0.5],
  graphic: graphics.dot,
  svg: `<circle cx="22" cy="22" r="16" fill="{{selectedColor}}" stroke="{{activeColor}}" stroke-width="6" paint-order="stroke fill"/>
  <circle cx="22" cy="22" r="12" fill="{{backgroundColor}}" stroke="{{haloColor}}" stroke-width="2" paint-order="stroke fill"/>
  <g transform="translate(22, 22) scale(0.8) translate(-8, -8)"><path d="{{graphic}}" fill="{{foregroundColor}}"/></g>`
}

export const square = {
  id: 'square',
  viewBox: '0 0 44 44',
  anchor: [0.5, 0.5],
  graphic: graphics.dot,
  svg: `<path d="M13 6h18c3.863 0 7 3.137 7 7v18c0 3.863-3.137 7-7 7H13c-3.863 0-7-3.137-7-7V13c0-3.863 3.137-7 7-7" fill="{{selectedColor}}" stroke="{{activeColor}}" stroke-width="6" paint-order="stroke fill"/>
  <path d="M13 34a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H13z" fill-rule="nonzero" fill="{{backgroundColor}}" stroke="{{haloColor}}" stroke-width="2" paint-order="stroke fill"/>
  <g transform="translate(22, 22) scale(0.8) translate(-8, -8)"><path d="{{graphic}}" fill="{{foregroundColor}}"/></g>`
}
