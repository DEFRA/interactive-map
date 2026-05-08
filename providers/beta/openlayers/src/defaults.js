// OS Maps API WMTS tile grid for EPSG:27700
// Resolutions derived from WMTS capabilities: ScaleDenominator × 0.00028 (OGC standard pixel size)
export const TILE_GRID_RESOLUTIONS = [896, 448, 224, 112, 56, 28, 14, 7, 3.5, 1.75, 0.875, 0.4375, 0.21875, 0.109375]

// Top-left corner of the OS National Grid extent
export const TILE_GRID_ORIGIN = [-238375.0, 1376256.0]

export const TILE_SIZE = 256

export const DEFAULTS = {
  animationDuration: 300,
  coordinatePrecision: 2
}

// Zoom level tolerance for min/max checks (fractional zoom)
export const ZOOM_TOLERANCE = 0.01

export const supportedShortcuts = ['showKeyboardHelp', 'selectControl', 'moveLarge', 'nudgeMap', 'zoomLarge', 'nudgeZoom']
