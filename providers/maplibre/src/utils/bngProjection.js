import { logger } from '../../../../src/services/logger.js'

export const BNG_CRS = 'EPSG:27700'

// Metres per pixel at zoom 0: the OS tile grid's zoom 0 extent across MapLibre's 512 pixel tiles
export const BNG_RESOLUTION_AT_ZOOM_0 = 3584

// MapLibre passes the definition to the workers' projection handler, which ignores it: the
// handler in bngTransform.mjs only converts British National Grid
const BNG_DEFINITION = '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs'

// The OS National Grid tile grid: zoom 0 is one 1,835,008 m square from the OS origin. The OS
// Vector Tile API's 27700 tiles are cut on it, so every tile source on a 27700 map must be too.
const OS_ORIGIN_EASTING = -238375
const OS_ORIGIN_NORTHING = 1376256
const OS_EXTENT_AT_ZOOM_0 = 1835008

const MISSING_SCRIPT_MESSAGE = "The British National Grid projection script wasn't included in the build, so the map can't load. " +
  "Some bundlers, such as Rollup and esbuild, don't copy it: copy node_modules/@defra/interactive-map/dist/esm/bngTransform.mjs " +
  "to your assets and set the MapLibre provider's crsWorkerUrl option. See https://defra.github.io/interactive-map/api#crsworkerurl"

let registration = null

/**
 * The URL of the script that sets the workers' projection handler. Written as a static
 * `new URL(..., import.meta.url)` so bundlers emit the file and rewrite this URL to it.
 *
 * @returns {string} The script URL.
 */
const getWorkerScriptUrl = () => {
  const url = new URL('./bngTransform.mjs', import.meta.url)
  // MapLibre imports a script as a module only when its URL ends in .mjs, and the UMD build emits
  // it as .js because some servers don't send a JavaScript content type for .mjs
  if (!url.pathname.endsWith('.mjs')) {
    url.hash = '.mjs'
  }
  return url.href
}

const register = async (maplibre, workerScriptUrl) => {
  const { forward, inverse } = await import(/* webpackChunkName: "im-maplibre-bng" */ './bngTransform.mjs')
  const projection = { forward, inverse }
  maplibre.addProjection({
    name: BNG_CRS,
    projection,
    tileMatrixSet: {
      origin: [OS_ORIGIN_EASTING, OS_ORIGIN_NORTHING],
      extentAtZoom0: OS_EXTENT_AT_ZOOM_0
    },
    definition: BNG_DEFINITION
  })
  await maplibre.importScriptInWorkers(workerScriptUrl || getWorkerScriptUrl()).catch(error => {
    logger.error(MISSING_SCRIPT_MESSAGE)
    throw error
  })
  return projection
}

/**
 * Registers British National Grid with MapLibre, on the main thread and in its workers. Runs once
 * per page, however many maps use it.
 *
 * @param {any} maplibre - The MapLibre GL JS module.
 * @param {string} [workerScriptUrl] - URL of bngTransform.mjs, when the bundler doesn't emit it.
 * @returns {Promise<{ forward: Function, inverse: Function }>} The transform MapLibre renders with:
 *   lng/lat to eastings and northings (forward) and back (inverse).
 */
export const registerBngProjection = (maplibre, workerScriptUrl) => {
  registration ??= register(maplibre, workerScriptUrl).catch(error => {
    registration = null
    throw error
  })
  return registration
}
