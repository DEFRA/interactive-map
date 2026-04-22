import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import babel from '@rollup/plugin-babel'
import alias from '@rollup/plugin-alias'
import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import postcss from 'rollup-plugin-postcss'
import { visualizer } from 'rollup-plugin-visualizer'

const __dirname = dirname(fileURLToPath(import.meta.url))

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
  'preact/compat',
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

const createESMConfig = (entryPath, outDir, isCore = false, manualChunks = null) => {
  const esmDir = path.resolve(__dirname, outDir)
  // Use the parent dir as output.dir so CSS can be emitted to css/index.css
  // (a sibling subdir) without Rollup 4's ban on ".." in emitted file names.
  const rootDir = path.resolve(esmDir, '..')
  const cssDir = path.resolve(rootDir, 'css')

  // Core build also cleans the shared dist/css before rebuilding
  const dirsToClean = isCore
    ? [path.resolve(__dirname, 'dist/css'), esmDir]
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
          // maplibre-gl is externalised so ESM consumers get a single shared
          // instance from their own node_modules rather than a 1 MB copy bundled
          // into the provider.  (UMD keeps it bundled — no bundler available there.)
          'maplibre-gl',
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
        // from being bundled separately (saves ~200 KB in draw-ml).
        dedupe: ['@turf/meta', '@turf/helpers', 'robust-predicates']
      }),
      commonjs({ include: /node_modules/ }),

      babel({
        // 'runtime' mode imports helpers from @babel/runtime rather than
        // inlining them.  This prevents Rollup from deduplicating helpers across
        // chunks (which caused static imports between entry and lazy chunks).
        babelHelpers: 'runtime',
        exclude: /node_modules/,
        extensions: ['.js', '.jsx'],
        plugins: ['@babel/plugin-transform-runtime'],
        // Override babel.config.json targets for ESM: target browsers that
        // natively support ES modules (Chrome 61+, Firefox 60+, Safari 10.1+).
        // The UMD build targets old browsers; the ESM build ships modern syntax
        // and lets the consumer's bundler handle their own browser targets.
        // This avoids transpiling classes, arrow functions, async/await etc.
        // into verbose ES5 — the single biggest driver of ESM bundle size.
        presets: [
          ['@babel/preset-env', { targets: { esmodules: true } }],
          ['@babel/preset-react', { runtime: 'automatic' }]
        ]
      }),

      // extract is an absolute path; Rollup resolves it relative to output.dir
      // (rootDir) → "css/index.css" — no ".." in the emitted fileName.
      postcss({
        extract: path.resolve(cssDir, 'index.css'),
        use: ['sass']
      }),

      terser(),

      // webpackChunkNamesPlugin must come after terser so comments survive
      webpackChunkNamesPlugin(),

      ...(isCore ? [removeFullCssPlugin(cssDir)] : []),

      // Only runs when ANALYZE=1 is set; writes stats to dist/stats/<name>.html
      ...(process.env.ANALYZE ? [visualizer({
        filename: path.resolve(__dirname, 'dist/stats', `${outDir.replace(/\//g, '-')}.html`),
        open: false,
        gzipSize: true
      })] : [])
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
        : 'esm/[name].js',
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
const ALL_BUILDS = [
  // Core
  { entryPath: './src/index.js', outDir: 'dist/esm', isCore: true },

  // Providers
  {
    entryPath: './providers/maplibre/src/index.js',
    outDir: 'providers/maplibre/dist/esm',
    // maplibre-gl is external; only the provider class itself becomes a chunk
    manualChunks: (id) => { if (id.includes('/maplibreProvider')) return 'im-maplibre-provider' }
  },
  {
    entryPath: './providers/beta/open-names/src/index.js',
    outDir: 'providers/beta/open-names/dist/esm',
    manualChunks: (id) => { if (id.includes('/reverseGeocode')) return 'im-reverse-geocode' }
  },
  {
    entryPath: './providers/beta/esri/src/index.js',
    outDir: 'providers/beta/esri/dist/esm',
    manualChunks: (id) => { if (id.includes('/esriProvider')) return 'im-esri-provider' }
  },

  // Plugins — each lazy-loads ./manifest.js; manualChunks names that split chunk
  {
    entryPath: './plugins/beta/scale-bar/src/index.js',
    outDir: 'plugins/beta/scale-bar/dist/esm',
    manualChunks: (id) => { if (id.includes('/manifest')) return 'im-scale-bar-plugin' }
  },
  {
    entryPath: './plugins/beta/use-location/src/index.js',
    outDir: 'plugins/beta/use-location/dist/esm',
    manualChunks: (id) => { if (id.includes('/manifest')) return 'im-use-location-plugin' }
  },
  {
    entryPath: './plugins/search/src/index.js',
    outDir: 'plugins/search/dist/esm',
    manualChunks: (id) => { if (id.includes('/manifest')) return 'im-search-plugin' }
  },
  {
    entryPath: './plugins/interact/src/index.js',
    outDir: 'plugins/interact/dist/esm',
    manualChunks: (id) => { if (id.includes('/manifest')) return 'im-interact-plugin' }
  },
  {
    entryPath: './plugins/beta/datasets/src/index.js',
    outDir: 'plugins/beta/datasets/dist/esm',
    manualChunks: (id) => { if (id.includes('/manifest')) return 'im-datasets-plugin' }
  },
  {
    entryPath: './plugins/beta/datasets/src/adapters/maplibre/index.js',
    outDir: 'plugins/beta/datasets/dist/adapters/maplibre/esm',
    manualChunks: (id) => {
      if (id.includes('maplibreLayerAdapter')) {
        return 'im-datasets-ml-adapter'
      }
    }
  },
  {
    entryPath: './plugins/beta/map-styles/src/index.js',
    outDir: 'plugins/beta/map-styles/dist/esm',
    manualChunks: (id) => { if (id.includes('/manifest')) return 'im-map-styles-plugin' }
  },
  {
    entryPath: './plugins/beta/draw-ml/src/index.js',
    outDir: 'plugins/beta/draw-ml/dist/esm',
    manualChunks: (id) => { if (id.includes('/manifest')) return 'im-draw-ml-plugin' }
  },
  {
    entryPath: './plugins/beta/draw-es/src/index.js',
    outDir: 'plugins/beta/draw-es/dist/esm',
    manualChunks: (id) => { if (id.includes('/manifest')) return 'im-draw-es-plugin' }
  },
  {
    entryPath: './plugins/beta/frame/src/index.js',
    outDir: 'plugins/beta/frame/dist/esm',
    manualChunks: (id) => { if (id.includes('/manifest')) return 'im-frame-plugin' }
  }
]

// === Filter via environment variable ===
const BUILD_TARGET = process.env.BUILD_TARGET // e.g., 'scale-bar' or 'dist/esm' (core)
const buildsToRun = BUILD_TARGET
  ? ALL_BUILDS.filter(b => b.outDir.includes(BUILD_TARGET))
  : ALL_BUILDS

export default buildsToRun.map(b =>
  createESMConfig(b.entryPath, b.outDir, b.isCore || false, b.manualChunks || null)
)
