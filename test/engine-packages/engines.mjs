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

const maplibreChecks = [
  ...BUNDLERS.map(bundler => ({
    name: bundler,
    bundler,
    copyWorker: BUNDLERS_WITHOUT_WORKER.includes(bundler)
  })),
  ...BUNDLERS_WITHOUT_WORKER.map(bundler => ({ name: `${bundler} without the worker`, bundler, ...MISSING_WORKER })),
  { name: 'umd', bundler: 'umd' }
]

// British National Grid coordinates of the same place as the MapLibre centre
const BNG_CENTRE = [433000, 335000]

// Served by the check's own server (see run.mjs), so no request leaves the machine
const VECTOR_STYLE = { id: 'test', url: 'style.json' }
const RASTER_STYLE = { id: 'test', type: 'raster', url: 'tiles/{z}/{x}/{y}.png' }

export const ENGINE_CHECKS = {
  maplibre: {
    name: 'maplibre',
    packageName: '@defra/interactive-map',
    mapStyle: VECTOR_STYLE,
    center: [-1.5, 53],
    zoom: 12,
    checks: maplibreChecks
  },
  openlayers: {
    name: 'openlayers',
    packageName: '@defra/interactive-map-openlayers',
    mapStyle: RASTER_STYLE,
    center: BNG_CENTRE,
    zoom: 8,
    checks: [...BUNDLERS.map(bundler => ({ name: bundler, bundler })), { name: 'umd', bundler: 'umd' }]
  }
}

Object.values(ENGINE_CHECKS).forEach(engine => { engine.entry = entryFor(engine.packageName) })
