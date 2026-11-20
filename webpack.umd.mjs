import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

import webpack from 'webpack'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import RemoveEmptyScriptsPlugin from 'webpack-remove-empty-scripts'
import RemoveFilesPlugin from 'remove-files-webpack-plugin'

const __dirname = dirname(fileURLToPath(import.meta.url))

const createUMDConfig = (entryName, entryPath, libraryPath, outDir, isCore = false, externalPreact = true, cssOutDir = null) => {
  const outPath = path.resolve(__dirname, outDir)
  const cssFolder = cssOutDir
    ? path.resolve(__dirname, cssOutDir, 'css')
    : path.resolve(outPath, '../css')
  const cssRelative = path.relative(outPath, cssFolder)

  if (!fs.existsSync(cssFolder)) {
    fs.mkdirSync(cssFolder, { recursive: true })
  }

  const plugins = [
    new RemoveEmptyScriptsPlugin(),
    new RemoveFilesPlugin({
      before: { include: [cssFolder] }
    }),
    new MiniCssExtractPlugin({
      filename: `${cssRelative}/${entryName}.css`
    }),
    new RemoveFilesPlugin({
      before: { include: [path.resolve(__dirname, outDir)] }
    }),
    // There's no Esri provider in UMD, so Esri code can never run here: leave out
    // @arcgis/core and the datasets Esri adapter rather than bundling ~100 MB of chunks.
    new webpack.IgnorePlugin({ resourceRegExp: /^@arcgis\/core|esriLayerAdapter/ })
  ]

  if (isCore) {
    plugins.push(
      new RemoveFilesPlugin({
        after: {
          test: [
            {
              folder: path.resolve(__dirname, 'dist/css'),
              method: p => p.endsWith('-full.css')
            }
          ]
        }
      })
    )
  }

  const libraryName = Array.isArray(libraryPath)
    ? ['defra', ...libraryPath]
    : ['defra', libraryPath]

  return {
    mode: 'production',

    // ES5 so the code that runs before the device check (webpack's runtime and the
    // entry chunks) parses in old browsers, which then show the not-supported message
    target: ['web', 'es5'],

    entry: { [entryName]: entryPath },

    parallelism: 100,

    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [fileURLToPath(import.meta.url)]
      }
    },

    output: {
      path: path.resolve(__dirname, outDir),
      filename: '[name].js',
      chunkFilename: '[name].js',
      library: {
        name: libraryName,
        type: 'umd',
        export: 'default',
        umdNamedDefine: true
      },
      // Not plain `this`: with the ES5 target the bundle runs in a strict-mode function, where it's undefined
      globalObject: "typeof self !== 'undefined' ? self : this",
      chunkLoadingGlobal: 'webpackChunkdefra_DefraMap',
      auxiliaryComment: {
        root: 'Root Export',
        commonjs: 'CommonJS Export',
        commonjs2: 'CommonJS2 Export',
        amd: 'AMD Export'
      }
    },

    externalsType: 'var',
    externalsPresets: { web: true },

    externals: externalPreact
      ? {
          react: 'preactCompat',
          'react-dom': 'preactCompat',
          'react-dom/client': 'preactCompat',
          'react/jsx-runtime': ['preactJsxRuntime'],
          'react/jsx-dev-runtime': ['preactJsxRuntime'],
          preact: 'preact',
          'preact/compat': 'preactCompat',
          'preact/hooks': 'preactHooks',
          'preact/jsx-runtime': ['preactJsxRuntime']
        }
      : {},

    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js'],
      // Plugins use the core's Preact through the externals above. The core bundles Preact
      // in place of React, as the ESM and dev builds do; React's module code also uses
      // Symbol, which would stop the entry point loading in old browsers.
      alias: externalPreact
        ? {
            preact: false,
            'preact/compat': false,
            'preact/hooks': false,
            'preact/jsx-runtime': false
          }
        : {
            react: path.resolve(__dirname, 'node_modules/preact/compat'),
            'react-dom/client': path.resolve(__dirname, 'node_modules/preact/compat/client'),
            'react-dom': path.resolve(__dirname, 'node_modules/preact/compat'),
            'react/jsx-runtime': path.resolve(__dirname, 'node_modules/preact/jsx-runtime')
          }
    },

    module: {
      rules: [
        { test: /\.jsx?$/, loader: 'babel-loader', exclude: /node_modules/ },
        // Emitted with a .js extension because some servers don't send a JavaScript
        // content type for .mjs, which module workers require
        { test: /maplibre-gl-worker\.mjs$/, type: 'asset/resource', generator: { filename: 'im-maplibre-worker.js' } },
        { test: /\.css$/i, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
        { test: /\.s[ac]ss$/i, use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'] }
      ]
    },

    plugins,

    // maplibre-gl builds a URL from an expression when its worker is cross-origin; harmless
    ignoreWarnings: [{ module: /maplibre-gl/, message: /Critical dependency/ }],

    optimization: {
      splitChunks: { chunks: () => false },
      removeEmptyChunks: true,
      // '...' keeps webpack's default JS minimizer (Terser); CssMinimizerPlugin
      // is added alongside it since setting `minimizer` explicitly replaces the
      // defaults otherwise.
      minimizer: ['...', new CssMinimizerPlugin()]
    }
  }
}

// === All builds ===
const ALL_BUILDS = [
  // Core UMD
  { entryPath: './src/index.umd.js', libraryPath: 'InteractiveMap', outDir: 'dist/umd', isCore: true, externalPreact: false },

  // Providers
  { entryPath: './providers/maplibre/src/index.js', libraryPath: 'maplibreProvider', outDir: 'providers/maplibre/dist/umd' },
  { entryPath: './providers/open-names/src/index.js', libraryPath: 'openNamesProvider', outDir: 'providers/open-names/dist/umd' },
  { entryPath: './providers/openlayers/src/index.js', libraryPath: 'openLayersProvider', outDir: 'providers/openlayers/dist/umd' },

  // Plugins
  { entryPath: './plugins/scale-bar/src/index.js', libraryPath: 'scaleBarPlugin', outDir: 'plugins/scale-bar/dist/umd' },
  { entryPath: './plugins/use-location/src/index.js', libraryPath: 'useLocationPlugin', outDir: 'plugins/use-location/dist/umd' },
  { entryPath: './plugins/search/src/index.js', libraryPath: 'searchPlugin', outDir: 'plugins/search/dist/umd' },
  { entryPath: './plugins/interact/src/index.js', libraryPath: 'interactPlugin', outDir: 'plugins/interact/dist/umd' },
  { entryPath: './plugins/datasets/src/index.js', libraryPath: 'datasetsPlugin', outDir: 'plugins/datasets/dist/umd', cssOutDir: 'plugins/datasets/dist' },
  { entryPath: './plugins/map-key/src/index.js', libraryPath: 'mapKeyPlugin', outDir: 'plugins/map-key/dist/umd', cssOutDir: 'plugins/map-key/dist' },
  { entryPath: './plugins/menu/src/index.js', libraryPath: 'menuPlugin', outDir: 'plugins/menu/dist/umd', cssOutDir: 'plugins/menu/dist' },
  { entryPath: './plugins/map-styles/src/index.js', libraryPath: 'mapStylesPlugin', outDir: 'plugins/map-styles/dist/umd' },
  { entryPath: './plugins/draw/src/index.js', libraryPath: 'drawPlugin', outDir: 'plugins/draw/dist/umd' },
  { entryPath: './plugins/frame/src/index.js', libraryPath: 'framePlugin', outDir: 'plugins/frame/dist/umd' }
]

// === Filter via environment variable ===
const BUILD_TARGET = process.env.BUILD_TARGET // e.g., 'scale-bar', 'core'
const buildsToRun = BUILD_TARGET
  ? ALL_BUILDS.filter(b => b.outDir.includes(BUILD_TARGET))
  : ALL_BUILDS

// === Export final config ===
export default buildsToRun.map(b =>
  createUMDConfig('index', b.entryPath, b.libraryPath, b.outDir, b.isCore || false, b.externalPreact !== false, b.cssOutDir || null)
)
