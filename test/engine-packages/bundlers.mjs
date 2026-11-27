// Builds the fixture app with each bundler, using the settings a service would: production mode
// and content-hashed file names. Each returns the entry scripts the page needs to load.
import fs from 'node:fs'
import path from 'node:path'

const webpack = async ({ projectDir, entry, outDir }) => {
  const { default: createCompiler } = await import('webpack')
  const config = {
    mode: 'production',
    context: projectDir,
    entry: { main: entry },
    output: {
      path: outDir,
      filename: '[name].[contenthash:8].js',
      chunkFilename: '[name].[contenthash:8].js',
      assetModuleFilename: '[name].[contenthash:8][ext]',
      publicPath: 'auto'
    },
    devtool: false,
    performance: { hints: false }
  }
  const stats = await new Promise((resolve, reject) => {
    createCompiler(config, (error, result) => {
      if (error || result.hasErrors()) {
        reject(error || new Error(result.toString('errors-only')))
        return
      }
      resolve(result)
    })
  })
  const { entrypoints } = stats.toJson({ all: false, entrypoints: true })
  return { scripts: entrypoints.main.assets.map(({ name }) => ({ src: name })) }
}

const vite = async ({ projectDir, entry, outDir }) => {
  const { build } = await import('vite')
  await build({
    root: projectDir,
    configFile: false,
    logLevel: 'silent',
    build: {
      outDir,
      emptyOutDir: false,
      manifest: 'manifest.json',
      modulePreload: { polyfill: false },
      rollupOptions: { input: entry }
    }
  })
  const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'))
  const { file } = Object.values(manifest).find(chunk => chunk.isEntry)
  return { scripts: [{ src: file, module: true }] }
}

const rollup = async ({ projectDir, entry, outDir }) => {
  const { rollup: createBundle } = await import('rollup')
  const { nodeResolve } = await import('@rollup/plugin-node-resolve')
  const { default: commonjs } = await import('@rollup/plugin-commonjs')
  const bundle = await createBundle({
    input: entry,
    plugins: [nodeResolve({ browser: true, rootDir: projectDir }), commonjs()],
    onwarn: () => {}
  })
  const { output } = await bundle.write({ dir: outDir, format: 'es', entryFileNames: '[name]-[hash].js', chunkFileNames: '[name]-[hash].js' })
  await bundle.close()
  return { scripts: [{ src: output.find(chunk => chunk.type === 'chunk' && chunk.isEntry).fileName, module: true }] }
}

const esbuild = async ({ entry, outDir }) => {
  const { build } = await import('esbuild')
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    splitting: true,
    minify: true,
    outdir: outDir,
    entryNames: '[name]-[hash]',
    chunkNames: '[name]-[hash]',
    metafile: true,
    logLevel: 'silent'
  })
  // Dynamically imported files are entry points too, so match the app's own
  const [file] = Object.entries(result.metafile.outputs).find(([, output]) => output.entryPoint?.endsWith('src/main.js'))
  return { scripts: [{ src: path.relative(outDir, path.resolve(file)), module: true }] }
}

export const bundlers = { webpack, vite, rollup, esbuild }
