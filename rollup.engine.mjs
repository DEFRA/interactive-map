// Builds each engine package's ESM files into packages/<engine>/, reusing the normal ESM build
// for every entry the engine includes (see engines.mjs). ENGINE=<name> builds just that engine.
import fs from 'node:fs'

import { createESMConfig, ALL_BUILDS, MAP_ENGINE_EXTERNALS } from './rollup.esm.mjs'
import { enginesToBuild, buildsForEngine, packageOutDir, adapterReplacements } from './engines.mjs'

// Copies the engine's copy folders into its package, replacing any earlier copy
const copyFoldersPlugin = (engineName, folders) => ({
  name: 'engine-copy-folders',
  buildStart () {
    folders.forEach(folder => {
      const to = `packages/${engineName}/${folder}`
      fs.rmSync(to, { recursive: true, force: true })
      fs.cpSync(folder, to, { recursive: true })
    })
  }
})

// Resolves each runtime adapter lookup to the engine's own version
const engineAdapterPlugin = (replacements) => ({
  name: 'engine-adapter',
  async resolveId (source, importer, options) {
    const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
    const replacement = resolved && replacements.get(resolved.id)
    return replacement ? { id: replacement } : null
  }
})

export default enginesToBuild().flatMap(([engineName, engine]) => {
  const replacements = adapterReplacements(engine)
  return buildsForEngine(engine, ALL_BUILDS).map(b => {
    // The core build includes the engine's provider, which loads the engine lazily
    const chunkNames = b.isCore ? engine.providerChunk : b.chunkNames
    const config = createESMConfig(b.entryPath, packageOutDir(engineName, engine, b.outDir), b.isCore || false, b.manualChunks || null, chunkNames)
    if (b.isCore) {
      config.external = [...config.external, ...MAP_ENGINE_EXTERNALS]
      config.plugins.push(copyFoldersPlugin(engineName, engine.copy))
    }
    config.plugins.unshift(engineAdapterPlugin(replacements))
    return config
  })
})
