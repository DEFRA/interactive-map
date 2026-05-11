import InteractiveMap from '../../src/index.js'
import { mapsRasterStyles27700 } from './mapStyles.js'
import { transformGeocodeRequest } from './auth.js'
// Providers
import openLayersProvider from '/providers/beta/openlayers/src/index.js'
import openNamesProvider from '/providers/beta/open-names/src/index.js'
// Plugins
import mapStylesPlugin from '/plugins/beta/map-styles/src/index.js'
import scaleBarPlugin from '/plugins/beta/scale-bar/src/index.js'
import searchPlugin from '/plugins/search/src/index.js'
import createInteractPlugin from '/plugins/interact/src/index.js'

const interactPlugin = createInteractPlugin({
  interactionModes: ['selectMarker', 'placeMarker'],
  multiSelect: false,
  deselectOnClickOutside: true
})

const interactiveMap = new InteractiveMap('map', {
  behaviour: 'hybrid',
  mapProvider: openLayersProvider({
    apiKey: process.env.OS_CLIENT_ID
  }),
  reverseGeocodeProvider: openNamesProvider({
    url: process.env.OS_NEAREST_URL,
    transformRequest: transformGeocodeRequest
  }),
  mapLabel: 'OS Maps raster map (OpenLayers, EPSG:27700)',
  center: [337297, 503695], // Lake District, Windermere — EPSG:27700 eastings/northings
  zoom: 5,
  minZoom: 0,
  maxZoom: 13,
  containerHeight: '650px',
  plugins: [
    mapStylesPlugin({
      mapStyles: mapsRasterStyles27700
    }),
    scaleBarPlugin({
      units: 'metric'
    }),
    searchPlugin({
      transformRequest: transformGeocodeRequest,
      osNamesURL: process.env.OS_NAMES_URL,
      width: '300px',
      showMarker: true
    }),
    interactPlugin
  ]
})

interactiveMap.on('map:ready', function () {
  console.log('OpenLayers map ready')
  interactPlugin.enable()
})

interactiveMap.on('map:firstidle', function (e) {
  console.log('map:firstidle', e)
})
