import { TILE_GRID_RESOLUTIONS, WORLD_LOD_RESOLUTIONS, WORLD_DEFAULT_MIN_ZOOM, WORLD_DEFAULT_MAX_ZOOM } from '../defaults.js'

export const ZOOM_ALIGNMENT = {
  UK: 'uk',
  WORLD: 'world'
}

/**
 * Returns OL View resolution config for the requested zoom alignment mode.
 * 'uk'    — OS tile grid zoom levels (0–13); zoom 0 shows all of Great Britain (default)
 * 'world' — ESRI LOD sequence; zoom levels match ESRI SDK, full UK visible around zoom 7
 */
export function getViewResolutionConfig (zoomAlignment) {
  if (zoomAlignment === ZOOM_ALIGNMENT.WORLD) {
    return {
      resolutions: WORLD_LOD_RESOLUTIONS,
      defaultMinZoom: WORLD_DEFAULT_MIN_ZOOM,
      maxZoom: WORLD_DEFAULT_MAX_ZOOM
    }
  }
  return {
    resolutions: TILE_GRID_RESOLUTIONS,
    defaultMinZoom: 0,
    maxZoom: TILE_GRID_RESOLUTIONS.length - 1
  }
}
