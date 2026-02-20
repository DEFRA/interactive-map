import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import RemoveEmptyScriptsPlugin from 'webpack-remove-empty-scripts'
import RemoveFilesPlugin from 'remove-files-webpack-plugin'

const __dirname = dirname(fileURLToPath(import.meta.url))

const ensureFolder = folder => {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true })
}

/**
 * Create ESM config for a single entry
 */
const createESMConfig = (entryName, entryPath, outDir, isCore = false) => {
  const cssFolder = path.resolve(__dirname, outDir, '../css')
  ensureFolder(cssFolder)

  const plugins = [
    new RemoveEmptyScriptsPlugin(),

    new MiniCssExtractPlugin({
      filename: '../css/[name].css'
    }),

    // Clean only this plugin's ESM folder before build
    new RemoveFilesPlugin({
      before: { include: [path.resolve(__dirname, outDir)] }
    })
  ]

  if (isCore) {
    // Core: clean shared dist/css before build
    plugins.unshift(
      new RemoveFilesPlugin({
        before: { include: [path.resolve(__dirname, 'dist/css')] }
      })
    )

    // Remove -full.css after build
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

  return {
    mode: 'production',
    entry: { [entryName]: entryPath }, // Keep entryName as "index"
    experiments: { outputModule: true },

    parallelism: 100,

    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [fileURLToPath(import.meta.url)]
      }
    },
    output: {
      path: path.resolve(__dirname, outDir, '../css'),
      filename: '../esm/[name].js',
      chunkFilename: '../esm/[name].js',
      library: { type: 'module' },
      asyncChunks: false
    },
    resolve: {
      extensions: ['.js', '.jsx'],
      alias: isCore
        ? {
            react: 'preact/compat',
            'react-dom': 'preact/compat',
            'react/jsx-runtime': 'preact/jsx-runtime'
          }
        : {}
    },
    externals: isCore
      ? {}
      : [
          {
            react: 'react',
            'react-dom': 'react-dom',
            'react/jsx-runtime': 'react/jsx-runtime',
            preact: 'preact',
            'preact/compat': 'preact/compat',
            'preact/hooks': 'preact/hooks',
            'preact/jsx-runtime': 'preact/jsx-runtime'
          },
          ({ request }, callback) => {
            if (request.startsWith('@arcgis/core')) {
              return callback(null, `module ${request}`)
            }
            return callback()
          }
        ],
    module: {
      rules: [
        { test: /\.jsx?$/, loader: 'babel-loader', exclude: /node_modules/ },
        { test: /\.css$/i, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
        { test: /\.s[ac]ss$/, use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'] }
      ]
    },
    plugins,
    optimization: {
      chunkIds: 'named',
      moduleIds: 'named',
      splitChunks: false
    }
  }
}

// === All builds ===
const ALL_BUILDS = [
  // Core
  { entryPath: './src/index.js', outDir: 'dist/esm', isCore: true },

  // Providers
  { entryPath: './providers/maplibre/src/index.js', outDir: 'providers/maplibre/dist/esm' },
  { entryPath: './providers/beta/open-names/src/index.js', outDir: 'providers/beta/open-names/dist/esm' },
  { entryPath: './providers/beta/esri/src/index.js', outDir: 'providers/beta/esri/dist/esm' },

  // Plugins
  { entryPath: './plugins/beta/scale-bar/src/index.js', outDir: 'plugins/beta/scale-bar/dist/esm' },
  { entryPath: './plugins/beta/use-location/src/index.js', outDir: 'plugins/beta/use-location/dist/esm' },
  { entryPath: './plugins/search/src/index.js', outDir: 'plugins/search/dist/esm' },
  { entryPath: './plugins/interact/src/index.js', outDir: 'plugins/interact/dist/esm' },
  { entryPath: './plugins/beta/datasets/src/index.js', outDir: 'plugins/beta/datasets/dist/esm' },
  { entryPath: './plugins/beta/map-styles/src/index.js', outDir: 'plugins/beta/map-styles/dist/esm' },
  { entryPath: './plugins/beta/draw-ml/src/index.js', outDir: 'plugins/beta/draw-ml/dist/esm' },
  { entryPath: './plugins/beta/draw-es/src/index.js', outDir: 'plugins/beta/draw-es/dist/esm' },
  { entryPath: './plugins/beta/frame/src/index.js', outDir: 'plugins/beta/frame/dist/esm' }
]

// === Filter via environment variable ===
const BUILD_TARGET = process.env.BUILD_TARGET // e.g., 'scale-bar' or 'core'
const buildsToRun = BUILD_TARGET
  ? ALL_BUILDS.filter(b => b.outDir.includes(BUILD_TARGET))
  : ALL_BUILDS

// === Export final config ===
export default buildsToRun.map(b =>
  createESMConfig('index', b.entryPath, b.outDir, b.isCore || false)
)
