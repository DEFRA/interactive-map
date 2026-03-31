/**
 * Built-in graphic path data strings for use with the `graphic` token.
 *
 * Each value is an SVG `d` attribute string designed for the standard 38×38 viewBox,
 * centred at (19, 16) — the visual centre of the built-in `pin` symbol.
 *
 * Pass a value directly as the `graphic` option when adding a marker or registering a symbol:
 *
 * @example
 * import { graphics } from './graphics.js'
 *
 * markers.add('id', coords, { symbol: 'pin', graphic: graphics.dot })
 *
 * @example
 * // Inline path data
 * markers.add('id', coords, { symbol: 'pin', graphic: 'M19 11 L19 21 M14 16 L24 16' })
 */
export const graphics = {
  /** Small filled circle — the default graphic for the built-in `pin` symbol */
  dot: 'M19 11.001c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.241 5-5-2.24-5-5-5z',

  /** Filled plus / cross shape */
  cross: 'M17 11.5h4v4h4v4h-4v4h-4v-4h-4v-4h4z',

  /** Filled diamond / rotated square */
  diamond: 'M19 10 L26 16 L19 22 L12 16 Z',

  /** Filled upward-pointing triangle */
  triangle: 'M19 10 L25.928 21 L12.072 21 Z',

  /** Filled square */
  square: 'M13.5 11.5 H24.5 V21.5 H13.5 Z'
}
