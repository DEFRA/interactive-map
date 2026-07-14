import InteractiveMap from '../../src/index.js'
import { vtsMapStyles3857 } from './mapStyles.js'
import { parcelSearch, gridRefSearchETRS89 } from './searchCustomDatasets.js'
import { transformGeocodeRequest, transformVtsRequest3857, transformDataRequest } from './auth.js'
// Providers
import maplibreProvider from '/providers/maplibre/src/index.js'
import openNamesProvider from '/providers/beta/open-names/src/index.js'
// Plugins
import mapStylesPlugin from '/plugins/beta/map-styles/src/index.js'
import createDatasetsPlugin from '/plugins/datasets/dist/esm/index.js'
import scaleBarPlugin from '/plugins/beta/scale-bar/src/index.js'
import searchPlugin from '/plugins/search/src/index.js'
import createInteractPlugin from '/plugins/interact/src/index.js'
import createFramePlugin from '/plugins/beta/frame/src/index.js'

const pointData = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { category: 'prehistoric', name: 'Prehistoric feature' },
    geometry: { coordinates: [-2.4558622, 54.5617135], type: 'Point' }
  },
  {
    type: 'Feature',
    properties: { category: 'roman', name: 'Roman feature' },
    geometry: { coordinates: [-2.439823, 54.5525437], type: 'Point' }
  },
  {
    type: 'Feature',
    properties: { category: 'medieval', name: 'Medieval feature' },
    geometry: { coordinates: [-2.4481939, 54.5575261], type: 'Point' }
  }]
}

const adjustedPointData = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { category: 'prehistoric', name: 'Prehistoric feature' },
    geometry: { coordinates: [-2.4758622, 54.5617135], type: 'Point' }
  },
  {
    type: 'Feature',
    properties: { category: 'roman', name: 'Roman feature' },
    geometry: { coordinates: [-2.449823, 54.5525437], type: 'Point' }
  },
  {
    type: 'Feature',
    properties: { category: 'medieval', name: 'Medieval feature' },
    geometry: { coordinates: [-2.4981939, 54.5575261], type: 'Point' }
  }]
}




const interactPlugin = createInteractPlugin({
  layers: [{
    layerId: 'historic-monuments-prehistoric',
  }, {
    layerId: 'historic-monuments-roman',
  }, {
    layerId: 'historic-monuments-medieval',
  }, {
    layerId: 'land-covers-110',
    // labelProperty: 'gid'
    // idProperty: 'gid'
  }, {
    layerId: 'land-covers-130-131',
    // labelProperty: 'gid'
    // idProperty: 'gid'
  }, {
    layerId: 'land-covers-332',
    // labelProperty: 'gid'
    // idProperty: 'gid'
  }, {
    layerId: 'land-covers-379',
    // labelProperty: 'gid'
    // idProperty: 'gid'
  }, {
    layerId: 'land-covers-other',
    // labelProperty: 'gid'
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
  }, {
    layerId: 'stroke-inactive.cold',
    // idProperty: 'id'
  }
  ],
  debug: true,
  interactionModes: ['selectMarker', 'selectFeature', 'placeMarker'], // e.g. ['selectMarker'], ['selectFeature'], ['placeMarker'], or combinations
  multiSelect: true,
  deselectOnClickOutside: true
})

const framePlugin = createFramePlugin({ aspectRatio: 1.5 })

const landCoversDataset = {
  id: 'land-covers',
  label: 'Land covers',
  dynamicGeoJSON: {
    idProperty: 'id',  // required - the ID that identifies individual features 
    url: `${process.env.FARMING_API_URL}/api/collections/parcels/items?sbi=106325052`, // required
    transformRequest: transformDataRequest,  // Required
    maxFeatures: 50000, // Optional: evict distant features when exceeded
  },
  // filter: ["!",["in",["to-string",["id"]],["literal",["12"]]]],
  // filter: [
  //   'all',
  //   ['!=', ['get', 'sbi'], '106223377'],
  //   ['==', ['get', 'is_dominant_land_cover'], true]
  // ],
  // tiles: ['https://farming-tiles-702a60f45633.herokuapp.com/field_parcels_with_hedges/{z}/{x}/{y}'],
  // sourceLayer: 'field_parcels_filtered',
  // featureLayer: '',
  // idProperty: 'id',  // Enables dynamic fetching + deduplication
  // filter: ['get', ['propertyName', 'warning']],
  query: {},
  minZoom: 10,
  maxZoom: 24,
  showInKey: true,
  showInMenu: true,
  style: {
    symbolDescription: 'Land cover',
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
  }, {
    id: 'permanent-grassland-2',
    label: 'Permanent grassland 2',
    filter: ['in', ['get', 'dominant_land_cover'], ['literal', ['130', '131']]], // 'dominant_land_cover = "130"'
    showInMenu: true,
    visible: false,
    style: {
      stroke: { outdoor: '#00897B', dark: '#ffffff' },
      fillPattern: 'diagonal-cross-hatch',
      fillPatternForegroundColor: { outdoor: '#00897B', dark: '#ffffff' },
      fillPatternBackgroundColor: 'transparent'
    }
  }, {
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
  }, {
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
  }, {
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
  }, {
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
}

const existingFieldsDataset = {
  id: 'existing-fields',
  label: 'Existing fields',
  groupLabel: 'Test group',
  filter: ['all', ['==', ['get', 'sbi'], '106223377'], ['==', ['get', 'is_dominant_land_cover'], true]],
  tiles: ['https://farming-tiles-702a60f45633.herokuapp.com/field_parcels_with_hedges/{z}/{x}/{y}'],
  sourceLayer: 'field_parcels_filtered',
  minZoom: 10,
  maxZoom: 24,
  showInKey: true,
  showInMenu: true,
  style: {
    stroke: { outdoor: '#1565C0', dark: '#ffffff' },
    strokeWidth: 2,
    fill: 'rgba(21,101,192,0.1)',
    symbolDescription: { outdoor: 'blue outline', dark: 'white outline' }
  }
}

const historicMonumentsDataset = {
  id: 'historic-monuments',
  label: 'Historic monuments',
  geojson: pointData,
  minZoom: 10,
  maxZoom: 24,
  showInKey: true,
  showInMenu: true,
  // style: {
  //   symbol: 'square',
  //   symbolGraphic: 'M3 15H1V1h2v2h2V1h2v5h2V4h2v2h2V4h2v11H6V9H3v6z', // Historic monument
  //   // symbolAnchor: [0.1, 0.1],
  //   // symbolBackgroundColor: { outdoor: '#ca3535', dark: '#ffffff' },
  //   // symbolForegroundColor: { outdoor: '#ffffff', dark: '#0b0c0c' }
  // },
  sublayers: [{
    id: 'prehistoric',
    label: 'Prehistoric',
    filter: ['in', ['get', 'category'], 'prehistoric'],
    showInMenu: true,
    style: {
      // symbolAnchor: [0.5, 0.5],
      symbol: 'circle',
      symbolGraphic: 'M3 15H1V1h2v2h2V1h2v5h2V4h2v2h2V4h2v11H6V9H3v6z', // Historic monument
      symbolBackgroundColor: '#00897B',
    }
  }, {
    id: 'roman',
    label: 'Roman',
    filter: ['in', ['get', 'category'], 'roman'],
    showInMenu: true,
    style: {
      // symbolAnchor: [0.1, 0.1],
      symbol: 'square',
      symbolGraphic: 'M3 15H1V1h2v2h2V1h2v5h2V4h2v2h2V4h2v11H6V9H3v6z', // Historic monument
      symbolBackgroundColor: '#ca3535',
    }
  }, {
    id: 'medieval',
    label: 'Medieval',
    filter: ['in', ['get', 'category'], 'medieval'],
    showInMenu: true,
    style: {
      // symbolAnchor: [0.9, 0.9],
      symbol: 'square',
      symbolGraphic: 'M3 15H1V1h2v2h2V1h2v5h2V4h2v2h2V4h2v11H6V9H3v6z', // Historic monument
      symbolBackgroundColor: '#1565C0',
    }
  }]
}
const hedgeControlDataset = {
  id: 'hedge-control',
  label: 'Hedge control',
  groupLabel: 'Test group',
  tiles: ['https://farming-tiles-702a60f45633.herokuapp.com/field_parcels_with_hedges/{z}/{x}/{y}'],
  sourceLayer: 'hedge_control',
  minZoom: 10,
  maxZoom: 24,
  showInKey: true,
  showInMenu: true,
  visibility: 'hidden',
  style: {
    stroke: '#b58840',
    fill: 'transparent',
    strokeWidth: 4,
    symbolDescription: { outdoor: 'blue outline' },
    keySymbolShape: 'line',
  }
}

const datasetsPlugin = createDatasetsPlugin({
  globals: {
    opacityMode: 'dataset', // 'dataset', 'global' or 'multiply'
    opacity: 0.75,
    visible: true
  },
  datasets: [
    landCoversDataset,
    existingFieldsDataset,
    historicMonumentsDataset,
    hedgeControlDataset
  ]
})

const interactiveMap = new InteractiveMap('map', {
  behaviour: 'hybrid',
  mapProvider: maplibreProvider(),
  reverseGeocodeProvider: openNamesProvider({
    url: process.env.OS_NEAREST_URL,
    transformRequest: transformGeocodeRequest
  }),
  mapLabel: 'Map showing field parcels and land use',
  minZoom: 6,
  maxZoom: 20,
  autoColorScheme: true,
  bounds: [-2.450804, 54.5599279, -2.403804, 54.6199279],
  containerHeight: '650px',
  transformRequest: transformVtsRequest3857,
  mapStyle: {
    url: process.env.OZS_OUTDOOR_URL,
    logo: '/assets/images/os-logo.svg',
    logoAltText: 'Ordnance survey logo',
    attribution: `Contains OS data ${String.fromCharCode(169)} Crown copyright and database rights ${(new Date()).getFullYear()}`,
    backgroundColor: '#f5f5f0'
  },
  plugins: [
    datasetsPlugin,
    mapStylesPlugin({
      mapStyles: vtsMapStyles3857
    }),
    scaleBarPlugin({
      units: 'metric'
    }),
    searchPlugin({
      transformRequest: transformGeocodeRequest,
      osNamesURL: process.env.OS_NAMES_URL,
      customDatasets: [parcelSearch, gridRefSearchETRS89],
      width: '300px',
      showMarker: true
      // expanded: true
    }),
    interactPlugin,
    framePlugin
  ]
})

interactiveMap.on('app:ready', function (e) {
  // console.log('app:ready')
})

interactiveMap.on('map:ready', function (e) {
  interactPlugin.enable()
})

// Datasets apiTests
const testVisibility = () => {
  // Hide all landcovers
  setTimeout(() => datasetsPlugin.setDatasetVisibility(false, { datasetId: 'land-covers' }), 2000)
  // Specifically hide landcovers-130-131
  setTimeout(() => datasetsPlugin.setDatasetVisibility(false, { datasetId: 'land-covers', sublayerId: '130-131' }), 3000)
  // Show landcovers - expect landcovers-130-131 to remain hidden
  setTimeout(() => datasetsPlugin.setDatasetVisibility(true, { datasetId: 'land-covers' }), 4000)
  // now reshow show landcovers-130-131
  setTimeout(() => datasetsPlugin.setDatasetVisibility(true, { datasetId: 'land-covers', sublayerId: '130-131' }), 5000)

  // TODO
  // setTimeout(() => datasetsPlugin.setDatasetVisibility(false, { rememberOriginalValues: false  }), 5000)
}

const testGlobalVisibility = () => {
  setTimeout(() => datasetsPlugin.setDatasetVisibility(false), 1000)
  setTimeout(() => datasetsPlugin.setDatasetVisibility(true), 2000)
  // setTimeout(() => datasetsPlugin.setDatasetVisibility(true, { datasetId: 'hedge-control' }), 500)
  // setTimeout(() => datasetsPlugin.setStyle({ stroke: { outdoor: '#0000ff' }, }, { datasetId: 'hedge-control' }), 2000)
}

const testFeatureVisibility = () => {
  // 29 and 16
  // setTimeout(() => datasetsPlugin.setFeatureVisibility(false, [12, 28, 19, 6], { datasetId: 'land-covers', idProperty: null }), 2000)
  // setTimeout(() => datasetsPlugin.setFeatureVisibility(true, [12, 28], { datasetId: 'land-covers', idProperty: null }), 4000)
  setTimeout(() => datasetsPlugin.setFeatureVisibility(false, [29], { datasetId: 'land-covers-130-131', idProperty: null }), 2000)
  setTimeout(() => datasetsPlugin.setFeatureVisibility(false, [16], { datasetId: 'land-covers-permanent-grassland-2', idProperty: null }), 2000)
}

const testSetOpacity = () => {
  setTimeout(() => datasetsPlugin.setOpacity(0.8, { datasetId: 'land-covers' }), 500)
  setTimeout(() => datasetsPlugin.setOpacity(0.2, { datasetId: 'land-covers', sublayerId: '130-131' }), 2000)
  setTimeout(() => datasetsPlugin.setOpacity(0.97, { datasetId: 'land-covers' }), 4000)
  setTimeout(() => datasetsPlugin.setOpacity(0), 6000)
  setTimeout(() => datasetsPlugin.setGlobals({ opacityMode: 'global' }), 7000)
  setTimeout(() => datasetsPlugin.setOpacity(0.8), 7500)
  setTimeout(() => datasetsPlugin.setGlobals({ opacityMode: 'dataset' }), 8000)
  setTimeout(() => datasetsPlugin.setGlobals({ opacityMode: 'multiply' }), 9000)
}

const testSetStyle = () => {
  setTimeout(() => datasetsPlugin.setStyle({
    stroke: { outdoor: '#ff0000', dark: '#ffffff' },
    fillPattern: 'horizontal-hatch',
    fillPatternForegroundColor: { outdoor: '#ff0000', dark: '#ffffff' },
    fillPatternBackgroundColor: 'transparent'
  }, { datasetId: 'land-covers', sublayerId: '130-131' }), 1000)
}

const testRemoveAndAddDataset = () => {
  setTimeout(() => datasetsPlugin.removeDataset('historic-monuments'), 2000)
  // setTimeout(() => datasetsPlugin.addDataset(landCoversDataset), 3000)
  setTimeout(() => datasetsPlugin.addDataset({ ...historicMonumentsDataset, label: 'New historic monuments' }), 4000)
}

const testGetters = () => {
  setTimeout(() => {
    console.log('Global Opacity', datasetsPlugin.getOpacity())
    console.log('Land Covers Opacity', datasetsPlugin.getOpacity({ datasetId: 'land-covers' }))
    console.log('Land Covers-130-131 Opacity', datasetsPlugin.getOpacity({ datasetId: 'land-covers', sublayerId: '130-131' }))
    console.log('Style without datasetId', datasetsPlugin.getStyle())
    console.log('Land Covers Opacity', datasetsPlugin.getStyle({ datasetId: 'land-covers' }))
    console.log('Land Covers-130-131 Opacity', datasetsPlugin.getStyle({ datasetId: 'land-covers', sublayerId: '130-131' }))
  }, 5000)
}

const testInvalidApiCalls = () => {
  setTimeout(() => {
    datasetsPlugin.setDatasetVisibility(false, { datasetId: 'non-existent-dataset' }) // Should log an error about dataset not found
    datasetsPlugin.setOpacity(0.5, { datasetId: 'non-existent-dataset' }) // Should log an error about dataset not found
    datasetsPlugin.addDataset(landCoversDataset) // Adding a dataset with an existing id - should log an error and ignore
    datasetsPlugin.removeDataset('historic-monuments-non-existent') // Should log an error about dataset not found
    datasetsPlugin.setFeatureVisibility(false, [29], { datasetId: 'invalid-id' })
    datasetsPlugin.setFeatureVisibility(true, [29], { datasetId: 'also-invalid-id' })
    datasetsPlugin.setStyle({ fillPattern: 'horizontal-hatch' }, { datasetId: 'land-covers', sublayerId: 'invalid-sublayer' }) // Should log an error about dataset not found
  }, 300)
}

const testSetData = () => {
  // Should cause the historic monuments to creep across the map as the coordinates are updated every 500ms
  const newData = { ...pointData }
  const features = [...newData.features]
  const feature1 = features[0]
  const feature2 = features[1]
  const feature3 = features[2]
  let counter = 0
  const increment = 0.001
  // Update coordinates of features to simulate change in data
  const updateCoordinates = () => {
    feature1.geometry.coordinates[0] += increment
    feature1.geometry.coordinates[1] += increment
    feature2.geometry.coordinates[0] -= increment
    feature2.geometry.coordinates[1] -= increment
    feature3.geometry.coordinates[0] += increment
    feature3.geometry.coordinates[1] -= increment
    counter++
    if (counter < 10) {
      setTimeout(updateCoordinates, 500)
    }
    datasetsPlugin.setData(newData, { datasetId: 'historic-monuments' })
  }
  setTimeout(updateCoordinates, 1000)
}

interactiveMap.on('datasets:ready', function () {
  testGetters()
  testInvalidApiCalls()
  testFeatureVisibility()
  testSetOpacity()
  testSetStyle()
  testVisibility()
  testGlobalVisibility()
  testRemoveAndAddDataset()
  testSetData()
})

// Ref to the selected features
let selectedFeatureIds = []

interactiveMap.on('interact:done', function (e) {
  console.log('interact:done', e)
})

interactiveMap.on('interact:cancel', function (e) {
  console.log('interact:cancel', e)
  interactPlugin.enable()
})

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