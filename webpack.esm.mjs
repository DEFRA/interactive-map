import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import RemoveEmptyScriptsPlugin from 'webpack-remove-empty-scripts'
import RemoveFilesPlugin from 'remove-files-webpack-plugin'
import { EsbuildPlugin } from 'esbuild-loader'

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

    parallelism: 50,

    cache: {
      type: 'filesystem',
      cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack-esm'),
      buildDependencies: {
        config: [fileURLToPath(import.meta.url)]
      }
    },
    output: {
      path: path.resolve(__dirname, outDir, '../css'),
      filename: '../esm/[name].js',
      chunkFilename: '../esm/[name].js',
      library: { type: 'module' }
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
      : {
          react: 'react',
          'react-dom': 'react-dom',
          'react/jsx-runtime': 'react/jsx-runtime',
          preact: 'preact',
          'preact/compat': 'preact/compat',
          'preact/hooks': 'preact/hooks',
          'preact/jsx-runtime': 'preact/jsx-runtime'
        },
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          loader: 'esbuild-loader',
          options: {
            loader: 'jsx',
            target: 'es2020',
            jsx: 'automatic'
          }
        },
        { test: /\.css$/i, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
        { test: /\.s[ac]ss$/, use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'] }
      ]
    },
    plugins,
    optimization: {
      chunkIds: 'named',
      moduleIds: 'named',
      splitChunks: false,
      minimizer: [
        new EsbuildPlugin({
          target: 'es2020',
          css: true
        })
      ]
    }
  }
}

// === All builds ===
const ALL_BUILDS = [
  // Core
  { entryPath: './src/index.js', outDir: 'dist/esm', isCore: true },

  // Providers
  { entryPath: './providers/maplibre/src/index.js', outDir: 'providers/maplibre/dist/esm' },
  { entryPath: './providers/open-names/src/index.js', outDir: 'providers/open-names/dist/esm' },
  { entryPath: './providers/esri/src/index.js', outDir: 'providers/esri/dist/esm' },

  // Plugins
  { entryPath: './plugins/scale-bar/src/index.js', outDir: 'plugins/scale-bar/dist/esm' },
  { entryPath: './plugins/use-location/src/index.js', outDir: 'plugins/use-location/dist/esm' },
  { entryPath: './plugins/search/src/index.js', outDir: 'plugins/search/dist/esm' },
  { entryPath: './plugins/interact/src/index.js', outDir: 'plugins/interact/dist/esm' },
  { entryPath: './plugins/datasets/src/index.js', outDir: 'plugins/datasets/dist/esm' },
  { entryPath: './plugins/map-styles/src/index.js', outDir: 'plugins/map-styles/dist/esm' },
  { entryPath: './plugins/draw-ml/src/index.js', outDir: 'plugins/draw-ml/dist/esm' },
  { entryPath: './plugins/frame/src/index.js', outDir: 'plugins/frame/dist/esm' }
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
