export const BNG_CRS = 'EPSG:27700'

// Metres per pixel at zoom 0: the OS tile grid's zoom 0 extent across MapLibre's 512 pixel tiles
export const BNG_RESOLUTION_AT_ZOOM_0 = 3584

// British National Grid, with the 7-parameter Helmert transform to WGS84 (accurate to a few metres)
const BNG_DEFINITION = '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs'

// The OS National Grid tile grid: zoom 0 is one 1,835,008 m square from the OS origin. The OS
// Vector Tile API's 27700 tiles are cut on it, so every tile source on a 27700 map must be too.
const OS_ORIGIN_EASTING = -238375
const OS_ORIGIN_NORTHING = 1376256
const OS_EXTENT_AT_ZOOM_0 = 1835008

// The workers build their own converter from BNG_DEFINITION, so GeoJSON sources are projected too
const WORKER_HANDLER = 'self.setProjectionHandler(definition => { const converter = proj4(definition); return { forward: converter.forward, inverse: converter.inverse } })'

let registration = null

/**
 * Loads proj4's standalone build as text and adds the projection handler, as one classic script
 * the MapLibre workers can run.
 *
 * @returns {Promise<string>} A blob URL of the script.
 */
const createWorkerScriptUrl = async () => {
  const proj4Url = new URL('proj4/dist/proj4.js', import.meta.url)
  const proj4Source = await fetch(proj4Url).then(response => response.text())
  const script = new Blob([proj4Source, '\n', WORKER_HANDLER], { type: 'text/javascript' })
  return URL.createObjectURL(script)
}

const register = async (maplibre) => {
  const { default: proj4 } = await import(/* webpackChunkName: "im-maplibre-proj4" */ 'proj4')
  const converter = proj4(BNG_DEFINITION)
  const projection = { forward: converter.forward, inverse: converter.inverse }
  maplibre.addProjection({
    name: BNG_CRS,
    projection,
    tileMatrixSet: {
      origin: [OS_ORIGIN_EASTING, OS_ORIGIN_NORTHING],
      extentAtZoom0: OS_EXTENT_AT_ZOOM_0
    },
    definition: BNG_DEFINITION
  })
  const workerScriptUrl = await createWorkerScriptUrl()
  await maplibre.importScriptInWorkers(workerScriptUrl)
  return projection
}

/**
 * Registers British National Grid with MapLibre, on the main thread and in its workers. Runs once
 * per page, however many maps use it.
 *
 * @param {any} maplibre - The MapLibre GL JS module.
 * @returns {Promise<{ forward: Function, inverse: Function }>} The transform MapLibre renders with:
 *   lng/lat to eastings and northings (forward) and back (inverse).
 */
export const registerBngProjection = (maplibre) => {
  registration ??= register(maplibre).catch(error => {
    registration = null
    throw error
  })
  return registration
}
