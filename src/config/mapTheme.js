/**
 * Canonical colour values for light and dark map colour schemes.
 * These are the single source of truth for map overlay colours —
 * used both by the symbol SVG renderer (JS canvas) and injected as
 * CSS custom properties onto the app container for CSS-rendered elements.
 *
 * Per-style overrides take precedence: set `haloColor`, `selectedColor`, or
 * `foregroundColor` directly on a `MapStyleConfig` to override these defaults.
 */
export const SCHEME_COLORS = {
  light: {
    haloColor: '#ffffff',
    selectedColor: '#0b0c0c',
    foregroundColor: '#0b0c0c'
  },
  dark: {
    haloColor: '#0b0c0c',
    selectedColor: '#ffffff',
    foregroundColor: '#ffffff'
  }
}

/**
 * Resolves the three map overlay colours for the given map style,
 * falling back to the appropriate scheme defaults when not explicitly set.
 * Stored in `mapState.mapTheme` so plugins can read resolved values without
 * importing from core.
 *
 * @param {import('../types.js').MapStyleConfig|null} mapStyle
 * @returns {{ haloColor: string, selectedColor: string, foregroundColor: string }}
 */
export const resolveMapTheme = (mapStyle) => {
  const scheme = SCHEME_COLORS[mapStyle?.mapColorScheme] ?? SCHEME_COLORS.light
  return {
    haloColor: mapStyle?.haloColor ?? scheme.haloColor,
    selectedColor: mapStyle?.selectedColor ?? scheme.selectedColor,
    foregroundColor: mapStyle?.foregroundColor ?? scheme.foregroundColor
  }
}

/**
 * Converts a mapStyle's overlay colours into CSS custom properties,
 * falling back to the appropriate scheme defaults when not explicitly set.
 * Suitable for spreading directly into a React `style` prop.
 *
 * @param {import('../types.js').MapStyleConfig|null} mapStyle
 * @returns {Object} CSS custom property object
 */
export const getMapThemeVars = (mapStyle) => {
  const { haloColor, selectedColor, foregroundColor } = resolveMapTheme(mapStyle)
  return {
    '--map-overlay-halo-color': haloColor,
    '--map-overlay-selected-color': selectedColor,
    '--map-overlay-foreground-color': foregroundColor
  }
}
