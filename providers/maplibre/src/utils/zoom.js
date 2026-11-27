import { BNG_CRS, BNG_RESOLUTION_AT_ZOOM_0 } from './bngProjection.js'

export const ZOOM_ALIGNMENT = {
  UK: 'uk',
  WORLD: 'world'
}

// Metres per pixel at zoom 0 for each zoom alignment, matching the OpenLayers provider:
// 'uk' is the OS tile grid levels (zoom 0 shows all of Great Britain), 'world' the Esri levels
const ZOOM_0_RESOLUTIONS = {
  [ZOOM_ALIGNMENT.UK]: 896,
  [ZOOM_ALIGNMENT.WORLD]: 156543.03392800014
}

/**
 * What to add to an API zoom to get MapLibre's own zoom. In EPSG:27700, MapLibre's zoom 0 is
 * 3,584 m/px, so this lines up its zooms with the OpenLayers and Esri providers' levels. In
 * EPSG:4326 the zooms are MapLibre's own.
 *
 * @param {string} crs
 * @param {'uk' | 'world'} [zoomAlignment='uk']
 * @returns {number}
 */
export const getZoomOffset = (crs, zoomAlignment = ZOOM_ALIGNMENT.UK) => {
  if (crs !== BNG_CRS) {
    return 0
  }
  const resolution = ZOOM_0_RESOLUTIONS[zoomAlignment] ?? ZOOM_0_RESOLUTIONS[ZOOM_ALIGNMENT.UK]
  return Math.log2(BNG_RESOLUTION_AT_ZOOM_0 / resolution)
}
