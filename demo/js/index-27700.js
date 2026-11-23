// index.js on a MapLibre map in British National Grid (crs: 'EPSG:27700'), on the OS tile grid.
// Everything is in eastings and northings, using index-ol.js's 27700 versions of index.js's data.
// Zooms follow the OS tile grid levels (zoomAlignment 'uk', the default), the same as index-ol.js.
// CSS
// import '../../dist/css/index.css'
// import '/plugins/map-styles/dist/css/index.css'
// import '/plugins/datasets/dist/css/index.css'
// import '/plugins/scale-bar/dist/css/index.css'
// import '/plugins/search/dist/css/index.css'
// import '/plugins/interact/dist/css/index.css'
// import '/plugins/frame/dist/css/index.css'
// InteractiveMap
import InteractiveMap from '../../src/index.js'
import { vtsMapStyles27700 } from './mapStyles.js'
import { gridRefSearchOSGB36 } from './searchCustomDatasets.js'
import { transformGeocodeRequest, transformVtsRequest27700, transformDataRequest } from './auth.js'
// Providers
import maplibreProvider from '/providers/maplibre/src/index.js'
import openNamesProvider from '/providers/open-names/src/index.js'
// Plugins
import useLocationPlugin from '/plugins/use-location/src/index.js'
import mapStylesPlugin from '/plugins/map-styles/src/index.js'
import createDatasetsPlugin from '/plugins/datasets/src/index.js'
import createMapKeyPlugin from '/plugins/map-key/src/index.js'
import scaleBarPlugin from '/plugins/scale-bar/src/index.js'
import searchPlugin from '/plugins/search/src/index.js'
import createInteractPlugin from '/plugins/interact/src/index.js'
import createFramePlugin from '/plugins/frame/src/index.js'
import { shieldSymbolSvg } from './customSymbols.js'

// Temporary: the outdoor style from farming-data, whose OS NGD tiles swap in the real OS features
// at the deepest zooms, instead of OS's rounded copies
const NGD_OUTDOOR_URL = 'http://localhost:8000/tiles/collections/ngd-base/styles/outdoor-27700'
const mapStyles = vtsMapStyles27700.map(mapStyle => mapStyle.id === 'outdoor' ? { ...mapStyle, url: NGD_OUTDOOR_URL } : mapStyle)

// Bounds and points from index-ol.js: index.js's, converted to EPSG:27700
const BOUNDS = [370945, 518391, 374023, 525049]

const POINT_DATA = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { category: 'prehistoric', name: 'Prehistoric feature' }, geometry: { type: 'Point', coordinates: [370619, 518593] } },
    { type: 'Feature', properties: { category: 'roman', name: 'Roman feature' }, geometry: { type: 'Point', coordinates: [371650, 517566] } },
    { type: 'Feature', properties: { category: 'medieval', name: 'Medieval feature' }, geometry: { type: 'Point', coordinates: [371112, 518124] } },
    { type: 'Feature', properties: { category: 'industrial', name: 'Industrial feature' }, geometry: { type: 'Point', coordinates: [371437, 518409] } },
    { type: 'Feature', properties: { category: 'modern', name: 'Modern feature' }, geometry: { type: 'Point', coordinates: [371642, 518040] } }
  ]
}

const interactPlugin = createInteractPlugin({
  layers: [{
    layerId: 'historic-monuments-prehistoric',
    idProperty: 'name',
    labelProperty: 'name'
  }, {
    layerId: 'historic-monuments-roman',
    idProperty: 'name',
    labelProperty: 'name'
  }, {
    layerId: 'historic-monuments-medieval',
    idProperty: 'name',
    labelProperty: 'name'
  }, {
    layerId: 'historic-monuments-industrial',
    idProperty: 'name',
    labelProperty: 'name'
  }, {
    layerId: 'historic-monuments-modern',
    idProperty: 'name',
    labelProperty: 'name'
  }, {
    layerId: 'land-covers-110',
    labelProperty: 'ngc'
    // idProperty: 'gid'
  },{
    layerId: 'land-covers-130-131',
    labelProperty: 'ngc'
    // idProperty: 'gid'
  },{
    layerId: 'land-covers-332',
    labelProperty: 'ngc'
    // idProperty: 'gid'
  },{
    layerId: 'land-covers-379',
    labelProperty: 'ngc'
    // idProperty: 'gid'
  },{
    layerId: 'land-covers-other',
    labelProperty: 'ngc'
    // idProperty: 'gid'
  },
  // {
  //   layerId: 'hedge-control',
  //   idProperty: 'id'
  // },
  // {
  //   layerId: 'OS/TopographicArea_1/Agricultural Land',
  //   idProperty: 'TOID'
  // },
  {
    layerId: 'fill-inactive.cold',
    // idProperty: 'id'
  },{
    layerId: 'stroke-inactive.cold',
    // idProperty: 'id'
  }
  ],
  debug: true,
  interactionModes: ['selectMarker', 'selectFeature', 'placeMarker'], // e.g. ['selectMarker'], ['selectFeature'], ['placeMarker'], or combinations
  multiSelect: true,
  deselectOnClickOutside: true
})

const framePlugin = createFramePlugin({
  aspectRatio: 1.5
})

const datasetsPlugin = createDatasetsPlugin({
  // Example: Dynamic bbox-based fetching (uncomment to test)
  datasets: [
  {
    id: 'land-covers',
    label: 'Land covers',
    geojson: `${process.env.FARMING_API_URL}/api/collections/parcels/items?sbi=106325052&crs=27700&limit=1000`, // 106200212
    // filter: [
    //   'all',
    //   ['!=', ['get', 'sbi'], '106223377'],
    //   ['==', ['get', 'is_dominant_land_cover'], true]
    // ],
    // tiles: ['https://farming-tiles-702a60f45633.herokuapp.com/field_parcels_with_hedges_osgb36/{z}/{x}/{y}'],
    // sourceLayer: 'field_parcels_osgb36',
    // featureLayer: '',
    // idProperty: 'id',  // Enables dynamic fetching + deduplication
    // filter: ['get', ['propertyName', 'warning']],
    query: {},
    transformRequest: transformDataRequest,  // Builds URL with bbox
    maxFeatures: 50000,  // Optional: evict distant features when exceeded
    showInKey: true,
    showInMenu: true,
    style: {
      fillPattern: 'horizontal-hatch',
      fillPatternForegroundColor: { outdoor: '#00897B', dark: '#ffffff' },
      fillPatternBackgroundColor: 'transparent'
    },
    sublayers: [{
      id: '130-131',
      label: 'Permanent grassland',
      filter: ['in', ['get', 'dominant_land_cover'], ['literal', ['130', '131']]], // 'dominant_land_cover = "130"'
      showInMenu: true,
      style: {
        stroke: { outdoor: '#00897B', dark: '#ffffff' },
        fillPattern: 'diagonal-cross-hatch',
        fillPatternForegroundColor: { outdoor: '#00897B', dark: '#ffffff' },
        fillPatternBackgroundColor: 'transparent'
      }
    },{
      id: '332',
      label: 'Woodland',
      filter: ['==', ['get', 'dominant_land_cover'], '332'],
      showInMenu: true,
      style: {
        stroke: { outdoor: '#2E7D32', dark: '#ffffff' },
        fillPattern: 'dot',
        fillPatternForegroundColor: { outdoor: '#2E7D32', dark: '#ffffff' },
        fillPatternBackgroundColor: 'transparent'
      }
    },{
      id: '110',
      label: 'Arable',
      filter: ['==', ['get', 'dominant_land_cover'], '110'],
      showInMenu: true,
      style: {
        stroke: { outdoor: '#6D4C41', dark: '#ffffff' },
        fillPattern: 'horizontal-hatch',
        fillPatternForegroundColor: { outdoor: '#6D4C41', dark: '#ffffff' },
        fillPatternBackgroundColor: 'transparent'
      }
    },{
      id: '379',
      label: 'Farmyards',
      filter: ['==', ['get', 'dominant_land_cover'], '379'],
      showInMenu: true,
      style: {
        stroke: { outdoor: '#6A1B9A', dark: '#ffffff' },
        fillPattern: 'forward-diagonal-hatch',
        fillPatternForegroundColor: { outdoor: '#6A1B9A', dark: '#ffffff' },
        fillPatternBackgroundColor: 'transparent'
      }
    },{
      id: 'other',
      label: 'Others',
      filter: ['!', ['in', ['get', 'dominant_land_cover'], ['literal', ['110', '130', '131', '332', '379']]]],
      showInMenu: true,
      style: {
        stroke: { outdoor: '#1565C0', dark: '#ffffff' },
        fill: 'rgba(0,0,255,0.1)',
        fillPattern: 'vertical-hatch',
        fillPatternForegroundColor: { outdoor: '#1565C0', dark: '#ffffff' },
        fillPatternBackgroundColor: 'transparent'
      }
    }]
  },
  {
    id: 'existing-fields',
    label: 'Existing fields',
    // groupLabel: 'Test group',
    filter: ['all',['==', ['get', 'sbi'], '106223377'],['==', ['get', 'is_dominant_land_cover'], true]],
    tiles: ['https://farming-tiles-702a60f45633.herokuapp.com/field_parcels_with_hedges_osgb36/{z}/{x}/{y}'],
    sourceLayer: 'field_parcels_osgb36',
    minZoom: 5,
    maxZoom: 19,
    showInKey: true,
    showInMenu: true,
    style: {
      stroke: { outdoor: '#1565C0', dark: '#ffffff'},
      strokeWidth: 2,
      fill: 'rgba(21,101,192,0.1)',
      symbolDescription: { outdoor: 'blue outline', dark: 'white outline' }
    }
  },{
    id: 'historic-monuments',
    label: 'Historic monuments',
    geojson: POINT_DATA,
    showInKey: true,
    showInMenu: true,
    style: {
      symbol: 'pin',
      symbolGraphic: 'M3 15H1V1h2v2h2V1h2v5h2V4h2v2h2V4h2v11H6V9H3v6z', // Historic monument
      // symbolBackgroundColor: { outdoor: '#ca3535', dark: '#ffffff' },
      // symbolForegroundColor: { outdoor: '#ffffff', dark: '#0b0c0c' }
    },
    sublayers: [{
      id: 'prehistoric',
      label: 'Prehistoric',
      filter: ['in', ['get', 'category'], 'prehistoric'],
      showInMenu: true,
      style: {
        symbol: 'circle',
        symbolBackgroundColor: '#00897B',
      }
    },{
      id: 'roman',
      label: 'Roman',
      filter: ['in', ['get', 'category'], 'roman'],
      showInMenu: true,
      style: {
        symbol: 'square',
        symbolBackgroundColor: '#ca3535',
      }
    },{
      id: 'medieval',
      label: 'Medieval',
      filter: ['in', ['get', 'category'], 'medieval'],
      showInMenu: true,
      style: {
        // A custom shield, to show symbolSvgContent with all its variants (see customSymbols.js)
        symbolSvgContent: shieldSymbolSvg,
        symbolBackgroundColor: '#1565C0',
        symbolAccentColor: { outdoor: '#ffdd00', dark: '#f47738' },
      }
    },{
      id: 'industrial',
      label: 'Industrial',
      filter: ['in', ['get', 'category'], 'industrial'],
      showInMenu: true,
      style: {
        symbol: 'triangle',
        symbolBackgroundColor: '#54319f',
      }
    },{
      id: 'modern',
      label: 'Modern',
      filter: ['in', ['get', 'category'], 'modern'],
      showInMenu: true,
      style: {
        symbol: 'diamond',
        symbolBackgroundColor: '#d53880',
      }
    }]
  },{
    id: 'hedge-control',
    label: 'Hedge control',
    // groupLabel: 'Test group',
    tiles: ['https://farming-tiles-702a60f45633.herokuapp.com/field_parcels_with_hedges_osgb36/{z}/{x}/{y}'],
    sourceLayer: 'hedge_control',
    minZoom: 5,
    maxZoom: 19,
    showInKey: true,
    showInMenu: true,
    // visibility: 'hidden',
    style: {
      stroke: '#b58840',
      strokeWidth: 4,
      symbolDescription: { outdoor: 'blue outline' },
    }
  }]
})

const interactiveMap = new InteractiveMap('map', {
  behaviour: 'hybrid',
  mapProvider: maplibreProvider({ crs: 'EPSG:27700' }),
  reverseGeocodeProvider: openNamesProvider({
    url: process.env.OS_NEAREST_URL,
    // url: '/api/os-nearest-proxy?query={query}',
    transformRequest: transformGeocodeRequest
    // showMarker: true
  }),
  // maxMobileWidth: 700,
  // minDesktopWidth: 960,
  mapLabel: 'Field parcels and land use map',
  // zoom: 14,
  minZoom: 6,
  maxZoom: 20,
  autoColorScheme: true,
  // center: [-2.938769, 54.893806],
  bounds: BOUNDS,
  containerHeight: '650px',
  transformRequest: transformVtsRequest27700,
  enableZoomControls: false,
  readMapText: true,
  // urlPosition: 'none',
  enableFullscreen: true,
  enableResetView: true,
  // hasExitButton: true,
  // markers: [{
  //   id: 'location',
  //   coords: [-2.9592267, 54.9045977],
  //   color: { outdoor: '#ff0000', dark: '#00ff00' }
  // }],
  mapStyle: {
    url: NGD_OUTDOOR_URL,
    logo: '/assets/images/os-logo.svg',
    logoAltText: 'Ordnance survey logo',
    attribution: `Contains OS data ${String.fromCharCode(169)} Crown copyright and database rights ${(new Date()).getFullYear()}`,
    backgroundColor: '#f5f5f0'
  },
  // symbolDefaults: {
  //   symbol: 'circle',
  //   backgroundColor: { outdoor: '#1d70b8', dark: '#4c9ed9' },
  //   haloColor: { outdoor: '#ffffff', dark: '#0b0c0c' },
  //   selectedColor: { outdoor: '#ffdd00', dark: '#ffaa00' }
  // },
  plugins: [
    searchPlugin({
      transformRequest: transformGeocodeRequest,
      osNamesURL: process.env.OS_NAMES_URL,
      customDatasets: [gridRefSearchOSGB36],
      width: '300px',
      showMarker: true,
      showLabel: true,
      // Search trigger and form in the top-right on tablet/desktop (mobile keeps its defaults)
      manifest: {
        buttons: [{
          id: 'search',
          tablet: { slot: 'top-right', showLabel: false },
          desktop: { slot: 'top-right', showLabel: false }
        }],
        controls: [{
          id: 'search',
          tablet: { slot: 'top-right' },
          desktop: { slot: 'top-right' }
        }]
      }
    }),
    datasetsPlugin,
    createMapKeyPlugin(),
    mapStylesPlugin({
      mapStyles
    }),
    scaleBarPlugin({
      units: 'metric'
    }),
    // useLocationPlugin(),
    interactPlugin,
    framePlugin
  ]
  // search
})

interactiveMap.on('app:ready', function (e) {
  // console.log('app:ready')
  interactiveMap.showHint('My hint', { duration: 0 })
})

// Spike: reachable from the browser console for checking positions
window.interactiveMap = interactiveMap

interactiveMap.on('map:ready', function (e) {
  // Spike: the MapLibre map, for checking positions from the browser console
  window.mapReadyEvent = e
  // framePlugin.addFrame('test', {
  //   aspectRatio: 1
  // })
  interactPlugin.enable()
  interactiveMap.addMarker('my-marker-1', [370642, 519019], { label: 'My label', showLabel: true })
  interactiveMap.addMarker('my-marker-2', [370925, 518827], { label: 'Another marker', symbol: 'square', graphic: 'M3 15H1V1h2v2h2V1h2v5h2V4h2v2h2V4h2v11H6V9H3v6z' })
})

interactiveMap.on('datasets:ready', function () {
  // setTimeout(() => datasetsPlugin.setFeatureVisibility(false, [55], { datasetId: 'land-covers', idProperty: null }), 2000)
  // setTimeout(() => datasetsPlugin.setFeatureVisibility(true, [55], { datasetId: 'land-covers', idProperty: null }), 4000)
  // setTimeout(() => datasetsPlugin.setStyle({ stroke: { outdoor: '#ff0000', dark: '#ffffff' }, fillPattern: 'horizontal-hatch', fillPatternForegroundColor: { outdoor: '#ff0000', dark: '#ffffff' } }, { datasetId: 'land-covers', sublayerId: '130' }), 2000)
})

// Ref to the selected features
let selectedFeatureIds = []


interactiveMap.on('interact:selectionchange', function (e) {
  const drawLayers = ['stroke-inactive.cold', 'fill-inactive.cold']
  const singleFeature = e.selectedFeatures.length === 1
  const anyFeature = e.selectedFeatures.length > 0
  const isDrawFeature = singleFeature && drawLayers.includes(e.selectedFeatures[0].layerId)
  const allDrawFeatures = anyFeature && e.selectedFeatures.every(function (f) { return drawLayers.includes(f.layerId) })
  selectedFeatureIds = e.selectedFeatures.map(function (f) { return f.featureId })
  interactiveMap.toggleButtonState('drawPolygon', 'disabled', !!singleFeature)
  interactiveMap.toggleButtonState('drawLine', 'disabled', !!singleFeature)
  interactiveMap.toggleButtonState('editFeature', 'disabled', !isDrawFeature)
  interactiveMap.toggleButtonState('deleteFeature', 'disabled', !allDrawFeatures)
})

interactiveMap.on('interact:markerchange', function (e) {
  // console.log('interact:markerchange', e)
})

// Update selected feature
interactiveMap.on('search:match', function (e) {
  if (e.type !== 'parcel') {
    return
  }
  // Need to determine the layerId
  // interactPlugin.selectFeature({
  //   featureId: e.id,
  //   layerId: 'existing-fields'
  // })
})

// Hide selected feature
interactiveMap.on('search:clear', function (e) {
  // console.log('Search clear')
})

// Frame events
interactiveMap.on('frame:done', function (e) {
  console.log('frame:done')
  drawPlugin.addFeature(e)
})

interactiveMap.on('frame:cancel', function (e) {
  console.log('frame:cancel')
  console.log(e)
})