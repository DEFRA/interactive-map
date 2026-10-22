// Builds each engine package's UMD files into packages/<engine>/, reusing the normal UMD build
// for every entry the engine includes (see engines.mjs). ENGINE=<name> builds just that engine.
//
// Unlike the normal UMD build, each entry copies its <script> tag's nonce to the files it loads
// later, and those files have content-hashed names, so the scripts work under a nonce-based
// Content Security Policy and with fingerprinted entry scripts.
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import webpack from 'webpack'

import { createUMDConfig, ALL_BUILDS } from './webpack.umd.mjs'
import { enginesToBuild, buildsForEngine, packageOutDir, adapterReplacements } from './engines.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url)) // NOSONAR - Standard Node.js convention in bundler configs

const COPY_NONCE = path.resolve(__dirname, 'src/InteractiveMap/copyNonce.js')

// Resolves each runtime adapter lookup to the engine's own version
const engineAdapterPlugin = (replacements) => new webpack.NormalModuleReplacementPlugin(/\.js$/, resource => {
  const replacement = resource.context && replacements.get(path.resolve(resource.context, resource.request))
  if (replacement) {
    resource.request = replacement
  }
})

const createEngineUMDConfig = (engineName, engine, b, replacements) => {
  const outDir = packageOutDir(engineName, engine, b.outDir)
  const cssOutDir = b.cssOutDir && packageOutDir(engineName, engine, b.cssOutDir)
  const config = createUMDConfig('index', b.entryPath, b.libraryPath, outDir, b.isCore || false, b.externalPreact !== false, cssOutDir)

  config.entry = { index: [COPY_NONCE, b.entryPath] }
  config.output.chunkFilename = '[name].[contenthash:8].js'
  const workerRule = config.module.rules.find(rule => String(rule.test).includes('maplibre-gl-worker'))
  workerRule.generator.filename = 'im-maplibre-worker.[contenthash:8].js'
  config.plugins.push(engineAdapterPlugin(replacements))

  // Its own cache: the normal UMD build's would hand back its fixed file names
  config.cache = {
    ...config.cache,
    name: `engine-${engineName}-${b.outDir.replace(/\//g, '-')}`, // NOSONAR replaceAll() requires Chrome 84 or later
    buildDependencies: { config: [fileURLToPath(import.meta.url), path.resolve(__dirname, 'webpack.umd.mjs'), path.resolve(__dirname, 'engines.mjs')] }
  }
  return config
}

export default enginesToBuild(engine => engine.umd).flatMap(([engineName, engine]) => {
  const replacements = adapterReplacements(engine)
  return buildsForEngine(engine, ALL_BUILDS).map(b => createEngineUMDConfig(engineName, engine, b, replacements))
})
