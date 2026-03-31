/**
 * Default token values applied to all symbols unless overridden at the constructor,
 * symbol registration, or marker creation level.
 * Color values may be a plain string or a map-style-keyed object
 * e.g. { outdoor: '#ffffff', dark: '#0b0c0c' }
 */
export const symbolDefaults = {
  symbol: 'pin',
  selected: { outdoor: '#0b0c0c', dark: '#ffffff' },
  halo: { outdoor: '#ffffff', dark: '#0b0c0c' },
  background: '#ca3535',
  foreground: '#ffffff',
  haloWidth: '1',
  selectedWidth: '6'
}
