import { merge } from 'webpack-merge'
import common from './webpack.dev.mjs'
import CompressionPlugin from 'compression-webpack-plugin'
import zlib from 'zlib'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

export default merge(common, {
  mode: 'production',
  target: ['web', 'es5'],
  devServer: {
    hot: false
  },
  plugins: [
    new CompressionPlugin({
      filename: '[path][base].br',
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      compressionOptions: {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        },
      },
      threshold: 10240,
      minRatio: 0.8,
    })
  ],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
      // Force these to resolve from root node_modules, preventing nested copies
      // inside geojson-rbush and mapbox-gl-snap from being bundled separately.
      '@turf/meta': path.resolve(dirname(fileURLToPath(import.meta.url)), 'node_modules/@turf/meta'),
      '@turf/helpers': path.resolve(dirname(fileURLToPath(import.meta.url)), 'node_modules/@turf/helpers'),
      'robust-predicates': path.resolve(dirname(fileURLToPath(import.meta.url)), 'node_modules/robust-predicates')
    }
  },
  performance: {
    hints: false,
    maxEntrypointSize: 2048000,
    maxAssetSize: 2048000
  }
})