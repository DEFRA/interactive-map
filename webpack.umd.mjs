import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import RemoveEmptyScriptsPlugin from 'webpack-remove-empty-scripts'
import RemoveFilesPlugin from 'remove-files-webpack-plugin'

const __dirname = dirname(fileURLToPath(import.meta.url))

const createUMDConfig = (entryName, entryPath, libraryPath, outDir, isCore = false, externalPreact = true) => {
  const cssFolder = path.resolve(__dirname, outDir, '../css')

  if (!fs.existsSync(cssFolder)) {
    fs.mkdirSync(cssFolder, { recursive: true })
  }

  const plugins = [
    new RemoveEmptyScriptsPlugin(),
    new RemoveFilesPlugin({
      before: { include: [cssFolder] }
    }),
    new MiniCssExtractPlugin({
      filename: `../css/${entryName}.css`
    }),
    new RemoveFilesPlugin({
      before: { include: [path.resolve(__dirname, outDir)] }
    })
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

    entry: { [entryName]: entryPath },

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
      globalObject: 'this',
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
      alias: {
        preact: false,
        'preact/compat': false,
        'preact/hooks': false,
        'preact/jsx-runtime': false
      }
    },

    module: {
      rules: [
        { test: /\.jsx?$/, loader: 'babel-loader', exclude: /node_modules/ },
        { test: /\.tsx?$/, loader: 'ts-loader', exclude: /node_modules/ },
        { test: /\.s[ac]ss$/i, use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'] }
      ]
    },

    plugins,

    optimization: {
      splitChunks: { chunks: () => false },
      removeEmptyChunks: true
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

  // Plugins
  { entryPath: './plugins/scale-bar/src/index.js', libraryPath: 'scaleBarPlugin', outDir: 'plugins/scale-bar/dist/umd' },
  { entryPath: './plugins/zoom-controls/src/index.js', libraryPath: 'zoomControlsPlugin', outDir: 'plugins/zoom-controls/dist/umd' },
  { entryPath: './plugins/use-location/src/index.js', libraryPath: 'drawPolygonMLPlugin', outDir: 'plugins/use-location/dist/umd' },
  { entryPath: './plugins/search/src/index.js', libraryPath: 'searchPlugin', outDir: 'plugins/search/dist/umd' },
  { entryPath: './plugins/interact/src/index.js', libraryPath: 'interactPlugin', outDir: 'plugins/interact/dist/umd' },
  { entryPath: './plugins/datasets/src/index.js', libraryPath: 'datasetsPlugin', outDir: 'plugins/datasets/dist/umd' },
  { entryPath: './plugins/map-styles/src/index.js', libraryPath: 'mapStylesPlugin', outDir: 'plugins/map-styles/dist/umd' },
  { entryPath: './plugins/draw-ml/src/index.js', libraryPath: 'drawMLPlugin', outDir: 'plugins/draw-ml/dist/umd' },
  { entryPath: './plugins/frame/src/index.js', libraryPath: 'framePlugin', outDir: 'plugins/frame/dist/umd' }
]

// === Filter via environment variable ===
const BUILD_TARGET = process.env.BUILD_TARGET // e.g., 'scale-bar', 'core'
const buildsToRun = BUILD_TARGET
  ? ALL_BUILDS.filter(b => b.outDir.includes(BUILD_TARGET))
  : ALL_BUILDS

// === Export final config ===
export default buildsToRun.map(b =>
  createUMDConfig('index', b.entryPath, b.libraryPath, b.outDir, b.isCore || false, b.externalPreact !== false)
)
