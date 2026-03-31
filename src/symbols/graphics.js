/**
 * Built-in graphic path data strings for use with the `graphic` token.
 *
 * Each value is an SVG `d` attribute string in a 16×16 coordinate space,
 * centred at (8, 8). The built-in symbols (`pin`, `circle`) apply a
 * `translate` transform to position this 16×16 area correctly within their
 * 38×38 viewBox — so graphic path data does not need to account for symbol
 * positioning.
 *
 * Pass a value directly as the `graphic` option when adding a marker or
 * registering a symbol:
 *
 * @example
 * import { graphics } from './graphics.js'
 *
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
