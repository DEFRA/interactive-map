// The map engines that each get their own package, built from the shared source into
// packages/<engine>/. Used by rollup.engine.mjs (ESM) and webpack.engine.umd.mjs (UMD).
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url)) // NOSONAR - Standard Node.js convention in bundler configs

// Every provider has its own build, but engine packages bundle theirs into the core build
const ENGINE_PROVIDERS = ['providers/maplibre', 'providers/openlayers', 'providers/esri']

const CORE_ENTRY = 'src/index.js'
const DATASETS_ADAPTER = 'plugins/datasets/src/adapters/importLayerAdapter.js'
const DRAW_ADAPTER = 'plugins/draw/src/adapters/loadDrawAdapter.js'

/**
 * - exclude: output folders of builds for other engines, left out of this package
 * - rename: output folders published under another path, so every package has the same imports
 * - replace: modules swapped for this engine's version. The core entry becomes one whose
 *   InteractiveMap creates the engine's provider, bundling the provider into the core build. The
 *   runtime adapter lookups become versions that import the engine's adapter directly, so it's
 *   bundled with its plugin and no other engine is referenced.
 * - providerChunk: the name of the provider's lazy file in the core build
 * - umd: whether the package has UMD scripts
 */
export const ENGINES = {
  maplibre: {
    exclude: [...ENGINE_PROVIDERS, 'plugins/draw-es'],
    rename: {},
    replace: {
      [CORE_ENTRY]: 'src/engines/maplibre.js',
      [DATASETS_ADAPTER]: 'plugins/datasets/src/adapters/maplibre/importLayerAdapter.js',
      [DRAW_ADAPTER]: 'plugins/draw/src/adapters/maplibre/loadDrawAdapter.js'
    },
    providerChunk: { maplibreProvider: 'im-maplibre-provider' },
    umd: true
  },
  openlayers: {
    exclude: [...ENGINE_PROVIDERS, 'plugins/draw-es'],
    rename: {},
    replace: {
      [CORE_ENTRY]: 'src/engines/openlayers.js',
      [DATASETS_ADAPTER]: 'plugins/datasets/src/adapters/openlayers/importLayerAdapter.js',
      [DRAW_ADAPTER]: 'plugins/draw/src/adapters/openlayers/loadDrawAdapter.js'
    },
    providerChunk: { openlayersProvider: 'im-openlayers-provider' },
    umd: true
  },
  // Esri's draw is its own, more basic plugin, published at the same path as the others'
  esri: {
    exclude: [...ENGINE_PROVIDERS, 'plugins/draw'],
    rename: { 'plugins/draw-es': 'plugins/draw' },
    replace: {
      [CORE_ENTRY]: 'src/engines/esri.js',
      [DATASETS_ADAPTER]: 'plugins/datasets/src/adapters/esri/importLayerAdapter.js'
    },
    providerChunk: { esriProvider: 'im-esri-provider' },
    umd: false
  }
}

/**
 * The engines to build: the one named by the ENGINE environment variable, or else all of them.
 *
 * @param {(engine: Object) => boolean} [include] - Leaves out engines this returns false for.
 * @returns {Array<[string, Object]>} Engine names and settings.
 */
export const enginesToBuild = (include = () => true) => {
  const name = process.env.ENGINE
  if (name && !ENGINES[name]) {
    throw new Error(`Unknown ENGINE "${name}". Use one of: ${Object.keys(ENGINES).join(', ')}`)
  }
  return Object.entries(ENGINES).filter(([engineName, engine]) => (!name || engineName === name) && include(engine))
}

const isWithin = (outDir, dir) => outDir === dir || outDir.startsWith(`${dir}/`)

/**
 * The builds an engine's package includes.
 *
 * @param {Object} engine - Engine settings from ENGINES.
 * @param {Array<{outDir: string}>} builds - Every build, from the ESM or UMD build list.
 * @returns {Array<Object>} The builds that aren't for another engine.
 */
export const buildsForEngine = (engine, builds) => builds.filter(b => !engine.exclude.some(dir => isWithin(b.outDir, dir)))

/**
 * Where a build's output goes in an engine's package.
 *
 * @param {string} engineName - Engine name.
 * @param {Object} engine - Engine settings from ENGINES.
 * @param {string} outDir - The build's output folder in the repo, e.g. 'plugins/draw-es/dist/esm'.
 * @returns {string} The output folder in the package, e.g. 'packages/esri/plugins/draw/dist/esm'.
 */
export const packageOutDir = (engineName, engine, outDir) => {
  const renamed = Object.entries(engine.rename).reduce(
    (dir, [from, to]) => isWithin(dir, from) ? to + dir.slice(from.length) : dir,
    outDir
  )
  return `packages/${engineName}/${renamed}`
}

/**
 * The engine's adapter modules, keyed by the absolute path of the runtime lookup they replace.
 *
 * @param {Object} engine - Engine settings from ENGINES.
 * @returns {Map<string, string>} Absolute paths: runtime lookup → engine version.
 */
export const adapterReplacements = (engine) => new Map(Object.entries(engine.replace).map(([from, to]) => [
  path.resolve(__dirname, from),
  path.resolve(__dirname, to)
]))
