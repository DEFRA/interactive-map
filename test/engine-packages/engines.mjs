// What to check for MapLibre and OpenLayers, the engines that support a strict Content Security
// Policy. Each check builds the fixture app one way: with a bundler, or from the UMD scripts.

const entryFor = (packageName) => `import InteractiveMap from '${packageName}'
import createDatasetsPlugin from '${packageName}/plugins/datasets'
import createDrawPlugin from '${packageName}/plugins/draw'
import { startMap } from './app.js'

startMap({ InteractiveMap, createDatasetsPlugin, createDrawPlugin })
`

const BUNDLERS = ['webpack', 'vite', 'rollup', 'esbuild']

// Rollup and esbuild don't copy MapLibre's worker, so the service copies it and sets workerUrl
const BUNDLERS_WITHOUT_WORKER = ['rollup', 'esbuild']

const MISSING_WORKER = {
  expectConsoleError: "MapLibre's worker file wasn't included in the build",
  expectFailedRequest: 'maplibre-gl-worker'
}

// British National Grid coordinates of the same place as the MapLibre centre
const BNG_CENTRE = [433000, 335000] // NOSONAR - fixed test coordinates

// The test area, a square around each centre
const LNG_LAT_TEST_AREA = [[-1.52, 52.99], [-1.48, 52.99], [-1.48, 53.01], [-1.52, 53.01], [-1.52, 52.99]] // NOSONAR - fixed test coordinates
const BNG_TEST_AREA = [[431000, 333000], [435000, 333000], [435000, 337000], [431000, 337000], [431000, 333000]] // NOSONAR - fixed test coordinates

// A MapLibre map in British National Grid, which also needs the provider's bngTransform.mjs
const BNG_VIEW = { center: BNG_CENTRE, zoom: 8, testArea: BNG_TEST_AREA, mapProviderOptions: { crs: 'EPSG:27700' } }

// Rollup and esbuild don't copy bngTransform.mjs either, so the service copies it and sets
// crsWorkerUrl. Without it the provider fails to load, which InteractiveMap rethrows.
const MISSING_BNG_SCRIPT = {
  expectConsoleError: "The British National Grid projection script wasn't included in the build",
  expectFailedRequest: 'bngTransform',
  expectPageError: true
}

const maplibreChecks = [
  ...BUNDLERS.map(bundler => ({
    name: bundler,
    bundler,
    copyWorker: BUNDLERS_WITHOUT_WORKER.includes(bundler)
  })),
  ...BUNDLERS_WITHOUT_WORKER.map(bundler => ({ name: `${bundler} without the worker`, bundler, ...MISSING_WORKER })),
  { name: 'umd', bundler: 'umd' },
  ...BUNDLERS.map(bundler => ({
    name: `${bundler} EPSG:27700`,
    bundler,
    view: BNG_VIEW,
    copyWorker: BUNDLERS_WITHOUT_WORKER.includes(bundler),
    copyBngScript: BUNDLERS_WITHOUT_WORKER.includes(bundler)
  })),
  ...BUNDLERS_WITHOUT_WORKER.map(bundler => ({
    name: `${bundler} EPSG:27700 without the British National Grid script`,
    bundler,
    view: BNG_VIEW,
    copyWorker: true,
    ...MISSING_BNG_SCRIPT
  })),
  { name: 'umd EPSG:27700', bundler: 'umd', view: BNG_VIEW }
]

// The name each engine's provider gives itself, which the code that picks an adapter at runtime
// checks for. A package that contains another engine's provider name includes that engine's code.
export const PROVIDER_NAMES = {
  maplibre: 'MapLibreProvider',
  openlayers: 'OpenLayersProvider',
  esri: 'EsriProvider'
}

// Served by the check's own server (see run.mjs), so no request leaves the machine
const VECTOR_STYLE = { id: 'test', url: 'style.json' }
const RASTER_STYLE = { id: 'test', type: 'raster', url: 'tiles/{z}/{x}/{y}.png' }

export const ENGINE_CHECKS = {
  maplibre: {
    name: 'maplibre',
    packageName: '@defra/interactive-map',
    mapStyle: VECTOR_STYLE,
    center: [-1.5, 53], // NOSONAR - fixed test coordinates
    zoom: 12,
    testArea: LNG_LAT_TEST_AREA,
    checks: maplibreChecks
  },
  openlayers: {
    name: 'openlayers',
    packageName: '@defra/interactive-map-openlayers',
    mapStyle: RASTER_STYLE,
    center: BNG_CENTRE,
    zoom: 8,
    testArea: BNG_TEST_AREA,
    checks: [...BUNDLERS.map(bundler => ({ name: bundler, bundler })), { name: 'umd', bundler: 'umd' }]
  }
}

Object.values(ENGINE_CHECKS).forEach(engine => { engine.entry = entryFor(engine.packageName) })
