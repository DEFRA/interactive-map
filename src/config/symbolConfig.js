/**
 * Default token values applied to all symbols unless overridden at the constructor,
 * symbol registration, or marker creation level.
 * Colour values may be a plain string or a map-style-keyed object,
 * e.g. { outdoor: '#ffffff', dark: '#0b0c0c' }
 */
export const symbolDefaults = {
  symbol: 'pin',
  selected: '#0b0c0c',
  halo: '#ffffff',
  background: '#ca3535',
  foreground: '#ffff',
  haloWidth: '1',
  selectedWidth: '6'
}

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
// Each symbol uses a 38×38 viewBox. SVG templates use {{token}} placeholders
// resolved at render time by the symbolRegistry.

export const pin = {
  id: 'pin',
  viewBox: '0 0 38 38',
  anchor: [0.5, 0.9], // NOSONAR
  graphic: graphics.dot,
  svg: `<path d="M19 33.499c-5.318-5-12-9.509-12-16.998 0-6.583 5.417-12 12-12s12 5.417 12 12c0 7.489-6.682 11.998-12 16.998z" fill="none" stroke="{{selected}}" stroke-width="{{selectedWidth}}"/>
  <path d="M19 33.499c-5.318-5-12-9.509-12-16.998 0-6.583 5.417-12 12-12s12 5.417 12 12c0 7.489-6.682 11.998-12 16.998z" fill="{{background}}" stroke="{{halo}}" stroke-width="{{haloWidth}}"/>
  <g transform="translate(19, 16) scale(0.8) translate(-8, -8)"><path d="{{graphic}}" fill="{{foreground}}"/></g>`
}

export const circle = {
  id: 'circle',
  viewBox: '0 0 38 38',
  anchor: [0.5, 0.5],
  graphic: graphics.dot,
  svg: `<path d="M19 7C12.376 7 7 12.376 7 19s5.376 12 12 12a12.01 12.01 0 0 0 12-12A12.01 12.01 0 0 0 19 7z" fill="none" stroke="{{selected}}" stroke-width="{{selectedWidth}}"/>
  <path d="M19 7C12.376 7 7 12.376 7 19s5.376 12 12 12a12.01 12.01 0 0 0 12-12A12.01 12.01 0 0 0 19 7z" fill="{{background}}" stroke="{{halo}}" stroke-width="{{haloWidth}}"/>
  <g transform="translate(19, 19) scale(0.8) translate(-8, -8)"><path d="{{graphic}}" fill="{{foreground}}"/></g>`
}

export const square = {
  id: 'square',
  viewBox: '0 0 38 38',
  anchor: [0.5, 0.5],
  graphic: graphics.dot,
  svg: `<path d="M28 7a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3h18z" fill="none" stroke="{{selected}}" stroke-width="{{selectedWidth}}"/>
  <path d="M28 7a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3h18z" fill="{{background}}" stroke="{{halo}}" stroke-width="{{haloWidth}}"/>
  <g transform="translate(19, 19) scale(0.8) translate(-8, -8)"><path d="{{graphic}}" fill="{{foreground}}"/></g>`
}
