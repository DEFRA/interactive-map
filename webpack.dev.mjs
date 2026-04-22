import webpack from 'webpack'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import { setupMiddlewares } from './demo/server/main.js'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import CopyPlugin from 'copy-webpack-plugin'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, './.env'), quiet: true })

export default {
  mode: 'development',
  target: ['web', 'es5'],
  devtool: [
    // produce a source-map to aid debugging
    { type: 'javascript', use: 'source-map' }
  ],
  entry: {
    index: path.join(__dirname, 'demo/js/index.js'),
    draw: path.join(__dirname, 'demo/js/draw.js'),
    farming: path.join(__dirname, 'demo/js/farming.js'),
    planning: path.join(__dirname, 'demo/js/planning.js')
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: '[name].js',
    clean: true
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    alias: {
      // Force these to resolve from root node_modules, preventing nested copies
      // inside geojson-rbush and mapbox-gl-snap from being bundled separately.
      '@turf/meta': path.resolve(__dirname, 'node_modules/@turf/meta'),
      '@turf/helpers': path.resolve(__dirname, 'node_modules/@turf/helpers'),
      'robust-predicates': path.resolve(__dirname, 'node_modules/robust-predicates')
    }
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/govuk-frontend/dist/govuk/govuk-frontend.min.css',
          to: 'assets/govuk-frontend.min.css'
        },
        {
          from: 'node_modules/govuk-frontend/dist/govuk/assets',
          to: 'assets'
        }
      ]
    }),
    new webpack.DefinePlugin({
      'process.env': {
        // OS Open Zoomstack
        OUTDOOR_URL: JSON.stringify(process.env.OUTDOOR_URL),
        NIGHT_URL: JSON.stringify(process.env.NIGHT_URL),
        DEUTERANOPIA_URL: JSON.stringify(process.env.DEUTERANOPIA_URL),
        TRITANOPIA_URL: JSON.stringify(process.env.TRITANOPIA_URL),
        // OS Vector Tile API (3857)
        VTS_OUTDOOR_URL: JSON.stringify(process.env.VTS_OUTDOOR_URL),
        VTS_DARK_URL: JSON.stringify(process.env.VTS_DARK_URL),
        VTS_BLACK_AND_WHITE_URL: JSON.stringify(process.env.VTS_BLACK_AND_WHITE_URL),
        // OS Vector Tile API (27700)
        VTS_OUTDOOR_URL_27700: JSON.stringify(process.env.VTS_OUTDOOR_URL_27700),
        VTS_DARK_URL_27700: JSON.stringify(process.env.VTS_DARK_URL_27700),
        VTS_BLACK_AND_WHITE_URL_27700: JSON.stringify(process.env.VTS_BLACK_AND_WHITE_URL_27700),
        // Aerial photography
        AERIAL_URL: JSON.stringify(process.env.AERIAL_URL),
        // OS Auth
        OS_CLIENT_ID: JSON.stringify(process.env.OS_CLIENT_ID),
        OS_CLIENT_SECRET: JSON.stringify(process.env.OS_CLIENT_SECRET),
        // OS Names API
        OS_NAMES_URL: JSON.stringify(process.env.OS_NAMES_URL),
        OS_NEAREST_URL: JSON.stringify(process.env.OS_NEAREST_URL),
        // Data services
        FARMING_TILE_SERVICE_URL: JSON.stringify(process.env.FARMING_TILE_SERVICE_URL),
        FARMING_API_URL: JSON.stringify(process.env.FARMING_API_URL)
      }
    })
  ],
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      }, {
        test: /\.s[ac]ss$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader']
      }, {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  devServer: {
    static: [
      {
        directory: path.join(__dirname, 'demo')
      },
      {
        directory: path.join(__dirname, 'public')
      },
      {
        directory: path.join(__dirname, 'assets'),
        publicPath: '/assets' // Images served from here as used in both demo and prototype kit plugin
      },
      {
        directory: __dirname,
        watch: false // serve built dist files (e.g. dist/umd/) without watching for changes
      }
    ],
    compress: true,
    port: 8080,
    open: true,
    hot: true,
    setupMiddlewares
  },
  optimization: {
    chunkIds: 'named',
    splitChunks: {
      chunks () {
        return false
      }
    }
  }
}
