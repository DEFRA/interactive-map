import { UK_VIEW_RESOLUTIONS, UK_DEFAULT_MAX_ZOOM, WORLD_LOD_RESOLUTIONS, WORLD_DEFAULT_MIN_ZOOM, WORLD_DEFAULT_MAX_ZOOM } from '../defaults.js'

export const ZOOM_ALIGNMENT = {
  UK: 'uk',
  WORLD: 'world'
}

/**
 * Returns OL View resolution config for the requested zoom alignment mode.
 * 'uk'    — OS tile grid zoom levels; zoom 0 shows all of Great Britain (default). Up to 13 by
 *           default, the grid's finest level, and up to 22 with a higher maxZoom
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
    resolutions: UK_VIEW_RESOLUTIONS,
    defaultMinZoom: 0,
    maxZoom: UK_DEFAULT_MAX_ZOOM
  }
}
