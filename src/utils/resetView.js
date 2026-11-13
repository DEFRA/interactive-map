/**
 * The view the map was configured with, ignoring any view read from the URL.
 * Follows the same order as getInitialMapState after the URL: bounds or extent, then center and zoom.
 *
 * @param {{ bounds?: any, extent?: any, center?: [number, number], zoom?: number }} appConfig
 * @returns {{ bounds: any } | { center: [number, number], zoom?: number } | null}
 */
export const getConfiguredView = ({ bounds, extent, center, zoom }) => {
  const configuredBounds = bounds || extent
  if (configuredBounds) {
    return { bounds: configuredBounds }
  }
  if (center) {
    return { center, zoom }
  }
  return null
}

/**
 * Moves the map to its configured view. Calls the overridden mapProvider methods, so the safe zone is respected.
 *
 * @param {object} mapProvider
 * @param {object} appConfig
 */
export const resetView = (mapProvider, appConfig) => {
  const view = getConfiguredView(appConfig)
  if (!view) {
    return
  }
  if (view.bounds) {
    mapProvider.fitToBounds(view.bounds)
  } else {
    mapProvider.setView(view)
  }
}

// How far the map can be from the reset view target and still count as at it. Absorbs the
// rounding of the reported center and zoom, not a move anyone would notice.
export const RESET_VIEW_PIXEL_TOLERANCE = 1
export const RESET_VIEW_ZOOM_TOLERANCE = 0.01

/**
 * Whether the map is at the reset view target: where it settled after its last reset, or after
 * loading at its configured view. Compares the center in screen pixels, so the tolerance is the
 * same in every CRS.
 *
 * @param {{ center?: [number, number], zoom?: number, resetViewTarget?: { center: [number, number], zoom: number } | null }} mapState
 * @param {{ mapToScreen: (coords: [number, number]) => { x: number, y: number } }} mapProvider
 * @returns {boolean}
 */
export const isAtResetViewTarget = ({ center, zoom, resetViewTarget }, mapProvider) => {
  if (!resetViewTarget || !center || !mapProvider) {
    return false
  }
  if (Math.abs(zoom - resetViewTarget.zoom) > RESET_VIEW_ZOOM_TOLERANCE) {
    return false
  }
  const current = mapProvider.mapToScreen(center)
  const target = mapProvider.mapToScreen(resetViewTarget.center)
  return Math.hypot(current.x - target.x, current.y - target.y) <= RESET_VIEW_PIXEL_TOLERANCE
}
