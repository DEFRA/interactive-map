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
      ? PREACT_EXTERNALS
      : [
          ...PREACT_EXTERNALS,
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

      nodeResolve({ extensions: ['.js', '.jsx'] }),
      commonjs({ include: /node_modules/ }),

      babel({
        babelHelpers: 'bundled',
        exclude: /node_modules/,
        extensions: ['.js', '.jsx']
        // Picks up babel.config.json automatically.
        // @rollup/plugin-babel passes a caller that tells @babel/preset-env
        // to keep ES module syntax (modules: 'auto' default behaviour).
      }),

      // extract is an absolute path; Rollup resolves it relative to output.dir
      // (rootDir) → "css/index.css" — no ".." in the emitted fileName.
      postcss({
        extract: path.resolve(cssDir, 'index.css'),
        use: ['sass']
      }),

      terser(),

      ...(isCore ? [removeFullCssPlugin(cssDir)] : [])
    ],

    output: {
      dir: rootDir,
      format: 'es',
      // JS files go into the esm/ subdirectory within rootDir
      entryFileNames: 'esm/index.js',
      chunkFileNames: 'esm/[name].js',
      // Rollup ignores webpack magic comments; manualChunks is how we assign
      // meaningful names to lazy-loaded splits.
      manualChunks: isCore
        ? (id) => { if (id.includes('/App/initialiseApp')) return 'im-core' }
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
