import InteractiveMap from '../../src/index.js'
// Providers
import openNamesProvider from '/providers/beta/open-names/src/index.js'
import openLayersProvider from '/providers/beta/openlayers/src/index.js'
// Plugins
import useLocationPlugin from '/plugins/beta/use-location/src/index.js'
import mapStylesPlugin from '/plugins/beta/map-styles/src/index.js'
import scaleBarPlugin from '/plugins/beta/scale-bar/src/index.js'
import searchPlugin from '/plugins/search/src/index.js'
import createInteractPlugin from '/plugins/interact/src/index.js'
// Demo utils
import { vtsMapStyles27700, ngdMapStyles27700 } from './mapStyles.js'
import { gridRefSearchOSGB36 } from './searchCustomDatasets.js'
import { transformGeocodeRequest, transformVtsRequest27700 } from './auth.js'
import { renderDatasetsHTML, hideMenu } from './planning/menu.js'
import { renderKeyHTML, toggleKeyItemVisibility, updateKeyColours } from './planning/key.js'
import { getQueryParam } from './planning/utils.js'
import { addVectorTileLayers, addFeatureLayers, setDataset, setMapFeatures, setColors } from './planning/layers-ol.js'

const interactPlugin = createInteractPlugin({
  marker: {
    symbol: 'pin',
    backgroundColor: { outdoor: '#0b0c0c', dark: '#ffffff' },
    foregroundColor: { outdoor: '#ffff', dark: '#0b0c0c' }
  },
  interactionModes: ['placeMarker']
})

const interactiveMap = new InteractiveMap('map', {
  behaviour: 'inline',
  mapProvider: openLayersProvider({
    zoomAlignment: 'world'
  }),
  reverseGeocodeProvider: openNamesProvider({
    url: process.env.OS_NEAREST_URL,
    transformRequest: transformGeocodeRequest
  }),
  mapLabel: 'Ambleside (OpenLayers)',
  minZoom: 6,
  maxZoom: 20,
  autoColorScheme: true,
  center: [337584, 504538],
  zoom: 14,
  containerHeight: '650px',
  transformRequest: transformVtsRequest27700,
  enableFullscreen: false,
  hasExitButton: true,
  plugins: [
    mapStylesPlugin({
      mapStyles: vtsMapStyles27700, // ngdMapStyles27700,
      manifest: {
        buttons: [{ id: 'mapStyles', desktop: { slot: 'right-top', showLabel: false } }],
        panels: [{ id: 'mapStyles', desktop: { slot: 'map-styles-button', width: '400px', modal: true } }]
      }
    }),
    scaleBarPlugin({ units: 'metric' }),
    searchPlugin({
      transformRequest: transformGeocodeRequest,
      placeholder: 'Search for a place in England',
      manifest: {
        controls: [{ id: 'search', desktop: { slot: 'top-left', showLabel: true } }]
      },
      osNamesURL: process.env.OS_NAMES_URL,
      regions: ['england'],
      customDatasets: [gridRefSearchOSGB36],
      width: '300px',
      showMarker: true
    }),
    useLocationPlugin(),
    interactPlugin
  ]
})

interactiveMap.on('app:ready', function () {
  interactiveMap.addButton('help', {
    label: 'Help',
    href: 'https://google.co.uk',
    iconSvgContent: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    mobile: { slot: 'right-top', showLabel: false },
    tablet: { slot: 'right-top', showLabel: false, order: 1 },
    desktop: { slot: 'right-top', showLabel: false, order: 1 }
  })
  interactiveMap.addButton('menu', {
    label: 'Menu',
    panelId: 'menu',
    iconSvgContent: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
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
  interactiveMap.addPanel('menu', {
    label: 'Menu',
    html: renderDatasetsHTML(),
    mobile: { slot: 'side', modal: true, open: false },
    tablet: { slot: 'side', width: '260px', open: true },
    desktop: { slot: 'side', width: '280px', open: true }
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
  const mapProvider = e
  const dataset = getQueryParam('dataset', 'floodzones-presentday')
  const mapFeatures = getQueryParam('features')
  addVectorTileLayers(mapProvider, dataset)
  addFeatureLayers(mapProvider, mapFeatures)
  toggleKeyItemVisibility({ dataset })
  toggleKeyItemVisibility({ mapFeatures })
  updateKeyColours(e.mapStyleId)
  interactPlugin.enable()

  document.addEventListener('fmp:datasetchanged', (evt) => {
    setDataset(evt.detail.dataset)
    toggleKeyItemVisibility(evt.detail)
  })

  document.addEventListener('fmp:featureschanged', (evt) => {
    setMapFeatures(evt.detail.mapFeatures)
    toggleKeyItemVisibility(evt.detail)
  })
})

interactiveMap.on('map:stylechange', function (e) {
  setColors(e.mapStyleId)
  updateKeyColours(e.mapStyleId)
})

interactiveMap.on('interact:markerchange', function (e) {
  interactiveMap.addPanel('info', {
    label: 'Info',
    html: '<p>Some info</p>',
    visibleGeometry: { type: 'Feature', geometry: { type: 'Point', coordinates: e.coords } }
  })
})
