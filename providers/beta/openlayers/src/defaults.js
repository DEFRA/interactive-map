// OS Maps API WMTS tile grid for EPSG:27700 — used by the tile source only
export const TILE_GRID_RESOLUTIONS = [896, 448, 224, 112, 56, 28, 14, 7, 3.5, 1.75, 0.875, 0.4375, 0.21875, 0.109375]

// World (ESRI-derived) LOD resolutions for EPSG:27700. When used in the OL View,
// view.zoom matches ESRI SDK zoom levels exactly. OL maps between view resolution
// and the nearest OS tile grid level automatically when loading tiles.
export const WORLD_LOD_RESOLUTIONS = [
  156543.03392800014, 78271.51696400007, 39135.758482000034, 19567.879241000017,
  9783.939620500008, 4891.969810250004, 2445.984905125002, 1222.992452562501,
  611.4962262812505, 305.74811314062526, 152.87405657031263, 76.43702828515632,
  38.21851414257816, 19.10925707128908, 9.55462853564454, 4.77731426782227,
  2.388657133911135, 1.1943285669555674, 0.5971642834777837, 0.29858214173889186,
  0.14929107086944593, 0.07464553543472296, 0.03732276771736148, 0.01866138385868074
]

// ESRI LOD 6 (~2446 m/px) matches the ESRI SDK's minimum zoom for EPSG:27700
export const WORLD_DEFAULT_MIN_ZOOM = 6

// ESRI LOD 20 (~0.149 m/px) is the last level that maps to a unique OS tile (zoom 13).
// Past this point OL upscales the same zoom-13 tiles with no additional detail.
export const WORLD_DEFAULT_MAX_ZOOM = 20

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
