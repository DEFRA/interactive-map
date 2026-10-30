import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import babel from '@rollup/plugin-babel'
import alias from '@rollup/plugin-alias'
import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import postcss from 'rollup-plugin-postcss'
import { visualizer } from 'rollup-plugin-visualizer'
import { transformAsync } from '@babel/core'

const __dirname = dirname(fileURLToPath(import.meta.url)) // NOSONAR - Standard Node.js convention in bundler configs

// The @babel/runtime range we ship. Without it, the runtime transform assumes an old runtime and
// imports the CommonJS-only @babel/runtime/regenerator, which Rollup can't load without a plugin.
const BABEL_RUNTIME_VERSION = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')).dependencies['@babel/runtime']

/**
 * Cleans output directories before each build starts.
 * Mirrors the RemoveFilesPlugin (before) behaviour from webpack.esm.mjs.
 */
const cleanPlugin = (dirs) => ({
  name: 'clean',
  buildStart () {
    for (const dir of dirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true })
      }
      fs.mkdirSync(dir, { recursive: true })
    }
  }
})

/**
 * Compiles the chunks that load before the device check (entries and the chunks
 * they import statically) to ES5, so older browsers can parse them and show the
 * not-supported message. Hosts' bundlers usually don't transpile node_modules.
 * Lazily loaded chunks keep modern syntax; they only load once the check passes.
 * import/export, import() and import.meta are left for the host's bundler.
 */
const es5InitialChunksPlugin = () => ({
  name: 'es5-initial-chunks',
  async renderChunk (code, chunk, _outputOptions, { chunks }) {
    const initial = new Set()
    const addWithStaticImports = (fileName) => {
      if (initial.has(fileName)) {
        return
      }
      initial.add(fileName)
      chunks[fileName]?.imports.forEach(addWithStaticImports)
    }
    Object.values(chunks).filter(c => c.isEntry).forEach(c => addWithStaticImports(c.fileName))

    if (!initial.has(chunk.fileName)) {
      return null
    }
    const result = await transformAsync(code, {
      babelrc: false,
      configFile: false,
      sourceType: 'module',
      presets: [['@babel/preset-env', { targets: { ie: '11' }, modules: false }]],
      plugins: [['@babel/plugin-transform-runtime', { version: BABEL_RUNTIME_VERSION }]]
    })
    return { code: result.code, map: null }
  }
})

// Adds webpackChunkName magic comments to all relative dynamic imports in the
// output, deriving the name from the imported file's basename.
// Must run AFTER terser() so the comments survive minification.
// This lets webpack consumers produce named chunks matching Rollup chunk names.
const webpackChunkNamesPlugin = () => ({
  name: 'webpack-chunk-names',
  renderChunk (code) {
    return {
      // Matches import("./some-chunk-name.js") — flat relative paths only
      code: code.replace(
        /import\("(\.\/([^/"]+))\.js"\)/g,
        (_, relPath, chunkName) => `import(/* webpackChunkName: "${chunkName}" */ "${relPath}.js")`
      ),
      map: null
    }
  }
})

/**
 * Removes any *-full.css artefacts after the core build.
 * Mirrors the RemoveFilesPlugin (after) behaviour from webpack.esm.mjs.
 */
const removeFullCssPlugin = (cssDir) => ({
  name: 'remove-full-css',
  closeBundle () {
    if (!fs.existsSync(cssDir)) {
      return
    }
    fs.readdirSync(cssDir)
      .filter(f => f.endsWith('-full.css'))
      .forEach(f => fs.unlinkSync(path.join(cssDir, f)))
  }
})

// Preact is a dependency of this package — all ESM builds externalize it so the
// consumer's bundler deduplicates to a single shared instance across core and
// plugins.  react/jsx-runtime etc. are not in this list because they are
// rewritten by the alias plugin before Rollup's external check fires.
const PREACT_EXTERNALS = [
  'preact',
  'preact/compat', // NOSONAR
  'preact/compat/client',
  'preact/hooks',
  'preact/jsx-runtime'
]

// @babel/runtime helpers are externalised so Rollup never inlines or
// deduplicates them across chunks.  Without this, shared helpers (classCallCheck,
// objectSpread2, etc.) end up in the lazy im-core chunk, forcing a static import
// from index.js and defeating lazy loading.  @babel/runtime is a regular
// dependency so it auto-installs for consumers and is resolved transparently.
const BABEL_RUNTIME_EXTERNAL = /@babel\/runtime/

const babelPlugin = () => babel({
  // 'runtime' mode imports helpers from @babel/runtime rather than
  // inlining them.  This prevents Rollup from deduplicating helpers across
  // chunks (which caused static imports between entry and lazy chunks).
  babelHelpers: 'runtime',
  exclude: /node_modules/,
  extensions: ['.js', '.jsx'],
  plugins: [['@babel/plugin-transform-runtime', { version: BABEL_RUNTIME_VERSION }]],
  // Override babel.config.json targets for ESM: target browsers that
  // natively support ES modules (Chrome 61+, Firefox 60+, Safari 10.1+).
  // The UMD build targets old browsers; the ESM build ships modern syntax
  // and lets the consumer's bundler handle their own browser targets.
  // This avoids transpiling classes, arrow functions, async/await etc.
  // into verbose ES5 — the single biggest driver of ESM bundle size.
  presets: [
    ['@babel/preset-env', { targets: { chrome: '92', edge: '92', firefox: '90', safari: '15.4', ios: '15.4' }, bugfixes: true }],
    ['@babel/preset-react', { runtime: 'automatic' }]
  ]
})

export const createESMConfig = (entryPath, outDir, isCore = false, manualChunks = null, chunkNames = {}) => {
  const esmDir = path.resolve(__dirname, outDir)
  // Use the parent dir as output.dir so CSS can be emitted to css/index.css
  // (a sibling subdir) without Rollup 4's ban on ".." in emitted file names.
  const rootDir = path.resolve(esmDir, '..')
  const cssDir = path.resolve(rootDir, 'css')

  // Core build also cleans the shared dist/css before rebuilding
  const dirsToClean = isCore
    ? [cssDir, esmDir]
    : [esmDir]

  return {
    input: entryPath,

    // react/* is intentionally absent — the alias plugin rewrites those imports
    // to preact/* before Rollup's external check, so only the preact IDs appear.
    external: isCore
      ? [...PREACT_EXTERNALS, BABEL_RUNTIME_EXTERNAL]
      : [
          ...PREACT_EXTERNALS,
          BABEL_RUNTIME_EXTERNAL,
          // Map engines (optional peers) are externalised so consumers share one copy
          // from their own node_modules; they ignore the engines they don't install
          // (see docs/getting-started.md).  UMD keeps them bundled.
          'maplibre-gl',
          /^ol\//,
          'proj4',
          /^@arcgis\/core/
        ],

    plugins: [
      cleanPlugin(dirsToClean),

      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
        preventAssignment: true
      }),

      // All builds alias react imports to preact equivalents.  Preact is a
      // listed external so after aliasing, Rollup marks the import as external
      // rather than bundling it — giving one shared preact instance per consumer
      // build rather than a separate copy per plugin chunk.
      alias({
        entries: [
          { find: 'react', replacement: 'preact/compat' },
          { find: 'react-dom/client', replacement: 'preact/compat/client' },
          { find: 'react-dom', replacement: 'preact/compat' },
          { find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime' }
        ]
      }),

      nodeResolve({
        extensions: ['.js', '.jsx'],
        // Force these packages to resolve from root node_modules only,
        // preventing nested copies inside geojson-rbush and mapbox-gl-snap
        // from being bundled separately (saves ~200 KB in draw).
        dedupe: ['@turf/meta', '@turf/helpers', 'robust-predicates']
      }),
      commonjs({ include: /node_modules/ }),

      babelPlugin(),

      // extract is an absolute path; Rollup resolves it relative to output.dir
      // (rootDir) → "css/index.css" — no ".." in the emitted fileName.
      postcss({
        extract: path.resolve(cssDir, 'index.css'),
        use: ['sass'],
        minimize: true
      }),

      es5InitialChunksPlugin(),

      terser(),

      // webpackChunkNamesPlugin must come after terser so comments survive
      webpackChunkNamesPlugin(),

      ...(isCore ? [removeFullCssPlugin(cssDir)] : []),

      // Only runs when ANALYZE=1 is set; writes stats to dist/stats/<name>.html
      ...(process.env.ANALYZE ? [visualizer({
        filename: path.resolve(__dirname, 'dist/stats', `${outDir.replace(/\//g, '-')}.html`), // NOSONAR replaceAll() requires Chrome 84 or later
        open: false,
        gzipSize: true
      })]
        : [])
    ],

    output: {
      dir: rootDir,
      format: 'es',
      // JS files go into the esm/ subdirectory within rootDir
      entryFileNames: 'esm/index.js',
      // Core: give auto-generated chunks meaningful names.
      // - initialiseApp → im-core.js  (the lazy Preact app chunk)
      // - anything else → im-shell.js (the sync InteractiveMap + shared utils chunk)
      chunkFileNames: isCore
        ? (chunk) => chunk.name === 'initialiseApp' ? 'esm/im-core.js' : 'esm/im-shell.js'
        : (chunk) => `esm/${chunkNames[chunk.name] || chunk.name}.js`,
      // Rollup ignores webpack magic comments; manualChunks is how we assign
      // meaningful names to lazy-loaded splits.
      // Core: no manualChunks — Rollup's natural algorithm keeps shared source
      // modules in the entry chunk, so the lazy initialiseApp split has no static
      // back-imports into index.js.  The chunk gets a name via chunkFileNames.
      manualChunks: isCore
        ? undefined
        : (manualChunks || undefined)
    }
  }
}

// === All builds ===
export const ALL_BUILDS = [
  // Core
  { entryPath: './src/index.js', outDir: 'dist/esm', isCore: true },

  // Providers
  {
    entryPath: './providers/maplibre/src/index.js',
    outDir: 'providers/maplibre/dist/esm',
    // maplibre-gl is external; only the provider class itself becomes a chunk
    manualChunks: (id) => id.includes('/maplibreProvider') ? 'im-maplibre-provider' : undefined
  },
  {
    entryPath: './providers/open-names/src/index.js',
    outDir: 'providers/open-names/dist/esm',
    manualChunks: (id) => id.includes('/reverseGeocode') ? 'im-reverse-geocode' : undefined
  },
  {
    entryPath: './providers/esri/src/index.js',
    outDir: 'providers/esri/dist/esm',
    manualChunks: (id) => id.includes('/esriProvider') ? 'im-esri-provider' : undefined
  },
  {
    entryPath: './providers/openlayers/src/index.js',
    outDir: 'providers/openlayers/dist/esm',
    manualChunks: (id) => id.includes('/openlayersProvider') ? 'im-openlayers-provider' : undefined
  },

  // Plugins — each lazy-loads ./manifest.js; manualChunks names that split chunk
  {
    entryPath: './plugins/scale-bar/src/index.js',
    outDir: 'plugins/scale-bar/dist/esm',
    manualChunks: (id) => id.includes('/manifest') ? 'im-scale-bar-plugin' : undefined
  },
  {
    entryPath: './plugins/use-location/src/index.js',
    outDir: 'plugins/use-location/dist/esm',
    manualChunks: (id) => id.includes('/manifest') ? 'im-use-location-plugin' : undefined
  },
  {
    entryPath: './plugins/search/src/index.js',
    outDir: 'plugins/search/dist/esm',
    manualChunks: (id) => id.includes('/manifest') ? 'im-search-plugin' : undefined
  },
  {
    entryPath: './plugins/interact/src/index.js',
    outDir: 'plugins/interact/dist/esm',
    manualChunks: (id) => id.includes('/manifest') ? 'im-interact-plugin' : undefined
  },
  {
    entryPath: './plugins/datasets/src/index.js',
    outDir: 'plugins/datasets/dist/esm',
    // Adapters renamed rather than in manualChunks — see the draw build below
    manualChunks: (id) => id.includes('/manifest') ? 'im-datasets-plugin' : undefined,
    chunkNames: { maplibreLayerAdapter: 'im-datasets-ml-adapter', openlayersLayerAdapter: 'im-datasets-ol-adapter', esriLayerAdapter: 'im-datasets-esri-adapter' }
  },
  {
    entryPath: './plugins/map-styles/src/index.js',
    outDir: 'plugins/map-styles/dist/esm',
    manualChunks: (id) => id.includes('/manifest') ? 'im-map-styles-plugin' : undefined
  },
  {
    entryPath: './plugins/draw/src/index.js',
    outDir: 'plugins/draw/dist/esm',
    // Adapters are renamed rather than put in manualChunks: manual chunks absorb their
    // dependencies, which put helpers shared by both adapters inside the MapLibre one, so
    // OpenLayers hosts downloaded the whole MapLibre adapter.  Left to Rollup, shared
    // helpers get a small chunk of their own.
    manualChunks: (id) => id.includes('/manifest') ? 'im-draw-plugin' : undefined,
    chunkNames: { MaplibreDrawAdapter: 'im-draw-ml-adapter', OLDrawAdapter: 'im-draw-ol-adapter' }
  },
  {
    entryPath: './plugins/draw-es/src/index.js',
    outDir: 'plugins/draw-es/dist/esm',
    manualChunks: (id) => id.includes('/manifest') ? 'im-draw-es-plugin' : undefined
  },
  {
    entryPath: './plugins/frame/src/index.js',
    outDir: 'plugins/frame/dist/esm',
    manualChunks: (id) => id.includes('/manifest') ? 'im-frame-plugin' : undefined
  },
  {
    entryPath: './plugins/map-key/src/index.js',
    outDir: 'plugins/map-key/dist/esm',
    manualChunks: (id) => id.includes('/manifest') ? 'im-map-key-plugin' : undefined
  },
  {
    entryPath: './plugins/menu/src/index.js',
    outDir: 'plugins/menu/dist/esm',
    manualChunks: (id) => id.includes('/manifest') ? 'im-menu-plugin' : undefined
  }
]

// === Filter via environment variable ===
const BUILD_TARGET = process.env.BUILD_TARGET // e.g., 'scale-bar' or 'dist/esm' (core)
const buildsToRun = BUILD_TARGET
  ? ALL_BUILDS.filter(b => b.outDir.includes(BUILD_TARGET))
  : ALL_BUILDS

export default buildsToRun.map(b =>
  createESMConfig(b.entryPath, b.outDir, b.isCore || false, b.manualChunks || null, b.chunkNames)
)
