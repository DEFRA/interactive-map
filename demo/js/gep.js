import InteractiveMap from '../../src/index.js'
import { vtsMapStyles27700, apgbAerialStyle } from './mapStyles.js'
import { transformGeocodeRequest, transformVtsRequest27700 } from './auth.js'
import '/plugins/beta/datasets/src/datasets.scss' // in a separate repo: import '@defra/interactive-map/plugins/datasets/css'
// Providers
import openLayersProvider from '/providers/beta/openlayers/src/index.js'
import openNamesProvider from '/providers/beta/open-names/src/index.js'
// Plugins
import mapStylesPlugin from '/plugins/beta/map-styles/src/index.js'
import scaleBarPlugin from '/plugins/beta/scale-bar/src/index.js'
import searchPlugin from '/plugins/search/src/index.js'
import createInteractPlugin from '/plugins/interact/src/index.js'
// GEP demo utils
import { addFieldParcelsLayer, renderLayersHTML, addLayerChangeHandler } from './gep/layers.js'
import { renderKeyHTML } from './gep/key.js'

const interactPlugin = createInteractPlugin({
  interactionModes: ['placeMarker'],
  multiSelect: false
})

const interactiveMap = new InteractiveMap('map', {
  behaviour: 'hybrid',
  mapProvider: openLayersProvider({
    zoomAlignment: 'world'
  }),
  reverseGeocodeProvider: openNamesProvider({
    url: process.env.OS_NEAREST_URL,
    transformRequest: transformGeocodeRequest
  }),
  transformRequest: transformVtsRequest27700,
  mapLabel: 'OS Vector Tile map (OpenLayers, EPSG:27700)',
  center: [368500, 520200], // Appleby-in-Westmorland — EPSG:27700
  zoom: 12,
  minZoom: 6,
  maxZoom: 20,
  containerHeight: '650px',
  plugins: [
    mapStylesPlugin({
      mapStyles: [...vtsMapStyles27700, apgbAerialStyle]
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

interactiveMap.on('app:ready', function () {
  interactiveMap.addButton('layers', {
    label: 'Layers',
    panelId: 'layers',
    iconSvgContent: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
    mobile: { slot: 'top-left', order: 1, showLabel: false },
    tablet: { slot: 'top-left', order: 2 },
    desktop: { slot: 'top-left', order: 2 }
  })
  interactiveMap.addButton('key', {
    label: 'Key',
    panelId: 'key',
    iconSvgContent: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>',
    mobile: { slot: 'top-left', order: 2, showLabel: false },
    tablet: { slot: 'top-left', order: 3 },
    desktop: { slot: 'top-left', order: 3 }
  })
  interactiveMap.addPanel('layers', {
    label: 'Layers',
    html: renderLayersHTML(),
    mobile: { slot: 'drawer', modal: true, open: false },
    tablet: { slot: 'side', width: '260px', open: false },
    desktop: { slot: 'side', width: '280px', open: false }
  })
  interactiveMap.addPanel('key', {
    label: 'Key',
    html: renderKeyHTML(),
    mobile: { slot: 'drawer', open: false, exclusive: true },
    tablet: { slot: 'left-top', width: '260px', open: false, exclusive: true },
    desktop: { slot: 'left-top', width: '280px', open: false, exclusive: true }
  })
})

interactiveMap.on('map:ready', function (e) {
  console.log('OpenLayers map ready')
  addFieldParcelsLayer(e.map)
  addLayerChangeHandler()
  interactPlugin.enable()
})

interactiveMap.on('interact:markerchange', function (e) {
  interactiveMap.addPanel('info', {
    label: 'Location',
    html: '<p>Some info</p>',
    visibleGeometry: { type: 'Feature', geometry: { type: 'Point', coordinates: e.coords } },
    mobile: { slot: 'drawer', open: true },
    tablet: { slot: 'left-top', width: '260px', open: true },
    desktop: { slot: 'left-top', width: '280px', open: true }
  })
})

interactiveMap.on('map:firstidle', function (e) {
  console.log('map:firstidle', e)
})
