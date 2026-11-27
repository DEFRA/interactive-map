// draw.js on a MapLibre map in British National Grid (crs: 'EPSG:27700'). Everything is in eastings
// and northings, using draw.js's data converted to EPSG:27700. Zooms are world-aligned
// (zoomAlignment 'world'), so draw.js's zoom levels carry over.
import proj4 from 'proj4'
// InteractiveMap
import InteractiveMap from '../../src/index.js'
import { vtsMapStyles27700 } from './mapStyles.js'
import { parcelSearch, gridRefSearchOSGB36 } from './searchCustomDatasets.js'
import { transformGeocodeRequest, transformVtsRequest27700, transformDataRequest } from './auth.js'
// Providers
import maplibreProvider from '/providers/maplibre/src/index.js'
import openNamesProvider from '/providers/open-names/src/index.js'
// Plugins
import mapStylesPlugin from '/plugins/map-styles/src/index.js'
import createDatasetsPlugin from '/plugins/datasets/src/index.js'
import createMapKeyPlugin from '/plugins/map-key/src/index.js'
import createDrawPlugin from '/plugins/draw/src/index.js'
import scaleBarPlugin from '/plugins/scale-bar/src/index.js'
import searchPlugin from '/plugins/search/src/index.js'
import createInteractPlugin from '/plugins/interact/src/index.js'

const pointData = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { coordinates: [343240.99, 535287.36], type: 'Point' } }, { type: 'Feature', properties: {}, geometry: { coordinates: [343553.76, 535314.98], type: 'Point' } }, { type: 'Feature', properties: {}, geometry: { coordinates: [343835.05, 535228.71], type: 'Point' } }] }

// The farming API's parcel search only answers in lng/lat, so its results are converted here, as any
// consumer of a 27700 map converts lng/lat data before adding it
const BNG = '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs'
const toBng = (lngLat) => proj4('EPSG:4326', BNG, lngLat)
const toBngBounds = ([minLng, minLat, maxLng, maxLat]) => {
  const corners = [[minLng, minLat], [minLng, maxLat], [maxLng, minLat], [maxLng, maxLat]].map(toBng)
  const eastings = corners.map(([easting]) => easting)
  const northings = corners.map(([, northing]) => northing)
  return [Math.min(...eastings), Math.min(...northings), Math.max(...eastings), Math.max(...northings)]
}
const parcelSearch27700 = {
  ...parcelSearch,
  parseResults: (json, query) => parcelSearch.parseResults(json, query).map(({ geometry, ...result }) => ({
    ...result,
    point: toBng(result.point),
    bounds: toBngBounds(result.bounds)
  }))
}

// Asks the farming API for parcels in the map's eastings/northings extent
const transformDataRequest27700 = (url, options) => {
  const request = transformDataRequest(url, options)
  return { ...request, url: `${request.url}&bbox-crs=27700` }
}

const interactPlugin = createInteractPlugin({
  layers: [{
    layerId: 'field-parcels',
    // idProperty: 'gid'
  },{
    layerId: 'linked-parcels',
    // idProperty: 'gid'
  },{
    layerId: 'OS/TopographicArea_1/Agricultural Land',
    idProperty: 'TOID'
  },{
    layerId: 'fill-inactive.cold',
    idProperty: 'id',
  },{
    layerId: 'stroke-inactive.cold',
    idProperty: 'id'
  },{
    layerId: 'point-symbol.cold',
    idProperty: 'id',
    labelProperty: 'user_label'
  }],
  // debug: true,
  interactionModes: ['selectMarker', 'selectFeature'], // e.g. ['selectMarker'], ['selectFeature'], ['placeMarker'], or combinations
  multiSelect: true,
  contiguous: false,
  deselectOnClickOutside: true,
  touchTarget: false, // touch users tap features directly; opening the map controls brings the crosshair and Select back
  debug: true
})

// Rough approximation of the England/Wales border as a line of easting (about 3°W in Cumbria) —
// good enough for a demo, not for anything that actually needs to be accurate.
const WALES_BORDER_EASTING = 335000

const getAllCoordinates = (coordinates) => {
  // A Point's coordinates are a single [easting, northing] pair, not a list of pairs like
  // LineString/Polygon — wrap it so the .every(([easting]) => ...) below still works.
  if (typeof coordinates[0] === 'number') {
    return [coordinates]
  }
  return Array.isArray(coordinates[0][0]) ? coordinates.flatMap(getAllCoordinates) : coordinates
}

const isEastOfWalesBorder = (geometry) =>
  getAllCoordinates(geometry.coordinates).every(([easting]) => easting > WALES_BORDER_EASTING)

// Stands in for a server-side check: resolves after a delay, or rejects if the shape
// changes again first
const wait = (ms, signal) => new Promise((resolve, reject) => {
  const timer = setTimeout(resolve, ms)
  signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason) }, { once: true })
})

const drawPlugin = createDrawPlugin({
  snapLayers: ['OS/TopographicArea_1/Agricultural Land', 'OS/TopographicLine/Building Outline'],
  snapMinZoom: 19,
  onGeometryPreview: (event) => ({
    valid: isEastOfWalesBorder(event.feature.geometry),
    reason: 'Points must be placed east of the England/Wales border'
  }),
  onGeometryChange: async (event, { signal }) => {
    await wait(800, signal)
    return {
      valid: isEastOfWalesBorder(event.feature.geometry),
      reason: 'Shapes must be east of the England/Wales border'
    }
  }
})

const datasetsPlugin = createDatasetsPlugin({
  // Example: Dynamic bbox-based fetching (uncomment to test)
  datasets: [{
    id: 'field-parcels',
    label: 'Field parcels',
    geojson: `${process.env.FARMING_API_URL}/api/collections/parcels/items?sbi=106325052&crs=27700`, // 106200212
    // filter: [
    //   'all',
    //   ['!=', ['get', 'sbi'], '106223377'],
    //   ['==', ['get', 'is_dominant_land_cover'], true]
    // ],
    // tiles: ['https://farming-tiles-702a60f45633.herokuapp.com/field_parcels_with_hedges_osgb36/{z}/{x}/{y}'],
    // sourceLayer: 'field_parcels_osgb36',
    featureLayer: '',
    vectorTileLayer: '',
    // idProperty: 'id',  // Enables dynamic fetching + deduplication
    // filter: ['get', ['propertyName', 'warning']],
    query: {},
    transformRequest: transformDataRequest27700,  // Builds URL with bbox
    maxFeatures: 50000,  // Optional: evict distant features when exceeded
    minZoom: 10,
    maxZoom: 24,
    // showInKey: true,
    // showInMenu: true,
    // visibility: 'hidden',
    style: {
      stroke: { outdoor: '#0000ff', dark: '#ffffff' },
      strokeWidth: 2,
      // fill: 'rgba(0,0,255,0.1)',
      fillPattern: 'diagonal-cross-hatch',
      fillPatternForegroundColor: { outdoor: '#0000ff', dark: '#ffffff' },
      fillPatternBackgroundColor: 'transparent',
      // opacity: 0.2
    }
  }]
})

const interactiveMap = new InteractiveMap('map', {
  behaviour: 'hybrid',
  mapProvider: maplibreProvider({ crs: 'EPSG:27700', zoomAlignment: 'world' }),
  reverseGeocodeProvider: openNamesProvider({
    url: process.env.OS_NEAREST_URL,
    // url: '/api/os-nearest-proxy?query={query}',
    transformRequest: transformGeocodeRequest
    // showMarker: true
  }),
  // maxMobileWidth: 700,
  // minDesktopWidth: 960,
  mapLabel: 'Map for drawing shapes',
  // zoom: 14,
  minZoom: 6,
  maxZoom: 20,
  autoColorScheme: true,
  // center: [-2.938769, 54.893806],
  bounds: [337026, 502811, 338514, 505508],
  containerHeight: '600px',
  transformRequest: transformVtsRequest27700,
  // enableZoomControls: true,
  // enableMapControls: false,
  readMapText: true,
  // enableFullscreen: true,
  // hasExitButton: true,
  backAndContinue: {
    backLabel: 'Back',
    continueLabel: 'Continue',
    continueEnabledWhen: ({ pluginStates }) => pluginStates.interact?.selectedFeatures.length > 0
  },
  // markers: [{
  //   id: 'location',
  //   coords: [-2.9592267, 54.9045977],
  //   color: { outdoor: '#ff0000', dark: '#00ff00' }
  // }],
  mapStyle: {
    url: process.env.VTS_OUTDOOR_URL_27700,
    logo: '/assets/images/os-logo.svg',
    logoAltText: 'Ordnance survey logo',
    attribution: `Contains OS data ${String.fromCharCode(169)} Crown copyright and database rights ${(new Date()).getFullYear()}`,
    showAttributionOnMobile: true,
    backgroundColor: '#f5f5f0'
  },
  plugins: [
    searchPlugin({
      transformRequest: transformGeocodeRequest,
      osNamesURL: process.env.OS_NAMES_URL,
      customDatasets: [parcelSearch27700, gridRefSearchOSGB36],
      width: '300px',
      showMarker: false,
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
      mapStyles: vtsMapStyles27700
    }),
    scaleBarPlugin({
      units: 'metric'
    }),
    interactPlugin,
    drawPlugin
  ]
  // search
})

interactiveMap.on('app:ready', function (event) {
  // console.log('app:ready')
})


interactiveMap.on('map:ready', function (event) {
  // framePlugin.addFrame('test', {
  //   aspectRatio: 1
  // })
  interactPlugin.enable()
  interactiveMap.addButton('geometryActions', {
    label: 'Draw tools',
    mobile: { slot: 'bottom-right', order: 3 },
    tablet: { slot: 'top-middle', order: 3 },
    desktop: { slot: 'top-middle', order: 3 },
    menuItems: [{
      id: 'addPoint',
      label: 'Add point',
      iconSvgContent: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
      onClick: function (event) {
        interactiveMap.toggleButtonState('geometryActions', 'hidden', true)
        drawPlugin.newPoint(crypto.randomUUID(), {
          symbol: 'pin',
          symbolBackgroundColor: { outdoor: '#1d70b8', dark: '#4c9ed9' }
        })
      }
    },{
      id: 'drawPolygon',
      label: 'Draw polygon',
      iconSvgContent: '<path d="M19.5 7v10M4.5 7v10M7 19.5h10M7 4.5h10"/><path d="M22 18v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zm0-15v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 18v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 3v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1z"/>',
      onClick: function (event) {
        interactiveMap.toggleButtonState('geometryActions', 'hidden', true)
        drawPlugin.newPolygon(crypto.randomUUID(), {
          stroke: '#e6c700',
          fill: 'rgba(255, 221, 0, 0.1)'
        })
      }
    },{
      id: 'drawLine',
      label: 'Draw line',
      iconSvgContent: '<path d="M5.706 16.294L16.294 5.706"/><path d="M21 2v3c0 .549-.451 1-1 1h-3c-.549 0-1-.451-1-1V2c0-.549.451-1 1-1h3c.549 0 1 .451 1 1zM6 17v3c0 .549-.451 1-1 1H2c-.549 0-1-.451-1-1v-3c0-.549.451-1 1-1h3c.549 0 1 .451 1 1z"/>',
      onClick: function (event) {
        interactiveMap.toggleButtonState('geometryActions', 'hidden', true)
        drawPlugin.newLine(crypto.randomUUID(), {
          stroke: { outdoor: '#99704a', dark: '#ffffff' },
          strokeWidth: 6
        })
      }
    },{
      id: 'editShape',
      label: 'Edit geometry',
      iconSvgContent: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
      isDisabled: true,
      onClick: function (event) {
        const editSuccess = drawPlugin.editFeature(selectedFeatureIds[0])
        if (!editSuccess) {
          return
        }
        interactiveMap.toggleButtonState('geometryActions', 'hidden', true)
        interactPlugin.disable()
      }
    },{
      id: 'splitShape',
      label: 'Split shape',
      iconSvgContent: '<path d="M8 19H5c-1 0-2-1-2-2V7c0-1 1-2 2-2h3"/><path d="M16 5h3c1 0 2 1 2 2v10c0 1-1 2-2 2h-3"/><line x1="12" x2="12" y1="4" y2="20"/>',
      isDisabled: true,
      onClick: function (event) {
        drawPlugin.split(selectedFeatureIds[0])
        interactiveMap.toggleButtonState('geometryActions', 'hidden', true)
        interactPlugin.disable()
      }
    },{
      id: 'mergeShapes',
      label: 'Merge shapes',
      iconSvgContent: '<path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3a1 1 0 0 0 1 1h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-3a1 1 0 0 0-1-1z"/>',
      isDisabled: true,
      onClick: function (event) {
        drawPlugin.merge(selectedFeatureIds)
        interactPlugin.clear()
      }
    },{
      id: 'deleteFeature',
      label: 'Delete feature',
      iconSvgContent: '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
      isDisabled: true,
      onClick: function (event) {
        interactiveMap.toggleButtonState('geometryActions', 'hidden', false)
        drawPlugin.deleteFeature(selectedFeatureIds)
        interactPlugin.clear()
        interactiveMap.toggleButtonState('addPoint', 'disabled', false)
        interactiveMap.toggleButtonState('drawPolygon', 'disabled', false)
        interactiveMap.toggleButtonState('drawLine', 'disabled', false)
        interactiveMap.toggleButtonState('editShape', 'disabled', true)
        interactiveMap.toggleButtonState('splitShape', 'disabled', true)
        interactiveMap.toggleButtonState('mergeShapes', 'disabled', true)
        interactiveMap.toggleButtonState('deleteFeature', 'disabled', true)
      }
    }]
  })
})

interactiveMap.on('datasets:ready', function () {
  // setTimeout(() => datasetsPlugin.setDatasetVisibility(false, { datasetId: 'field-parcels' }), 2000)
  // setTimeout(() => datasetsPlugin.setDatasetVisibility(true, { datasetId: 'field-parcels' }), 4000)
})

// Ref to the selected features
let selectedFeatureIds = []

interactiveMap.on('draw:ready', function () {
  drawPlugin.addFeature({
    id: crypto.randomUUID(),
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [337770.21, 504159.65] },
    properties: {
      symbol: 'pin',
      symbolBackgroundColor: { outdoor: '#1d70b8', dark: '#4c9ed9' },
      label: 'A pin'
    }
  })
  const squarePointId = crypto.randomUUID()
  drawPlugin.addFeature({
    id: squarePointId,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [337842.29, 504229.65] },
    properties: {
      symbol: 'square',
      symbolGraphic: 'M3 15H1V1h2v2h2V1h2v5h2V4h2v2h2V4h2v11H6V9H3v6z', // Historic monument
      symbolBackgroundColor: { outdoor: '#ca3535', dark: '#ffffff' },
      symbolForegroundColor: { outdoor: '#ffffff', dark: '#0b0c0c' },
      label: 'A square point'
    }
  })
  drawPlugin.addFeature({
    id: 'test1234',
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[[343444.12, 535303.04], [343569.02, 535233.59], [343682.63, 535130.83], [343715.39, 535125.31], [343778.95, 535121.45], [343817.87, 535198.76], [343785.79, 535258.52], [343732.32, 535330.84], [343704.33, 535389.52], [343641.85, 535397.47], [343620.2, 535388.53], [343507.66, 535412.46], [343499.92, 535367.52], [343486.34, 535348.23], [343455.5, 535343.51], [343444.12, 535303.04]], [[343530.21, 535329.26], [343599.16, 535294.2], [343665.74, 535286.22], [343694.73, 535308.37], [343692.1, 535344.22], [343677.1, 535375.12], [343648.44, 535379.57], [343610.78, 535373.3], [343563.69, 535381.04], [343536.81, 535365.01], [343530.21, 535329.26]]] },
    stroke: 'rgba(0,112,60,1)',
    fill: 'rgba(0,112,60,0.2)',
    strokeWidth: 2
  })
  // drawPlugin.split('test1234', {
  //   snapLayers: ['OS/TopographicArea_1/Agricultural Land']
  // })
  // drawPlugin.newPolygon('test', {
  //   snapLayers: ['OS/TopographicArea_1/Agricultural Land']
  // })
  // drawPlugin.editFeature('test1234', {
  //   snapLayers: ['OS/TopographicArea_1/Agricultural Land']
  // })
})

interactiveMap.on('draw:started', function (event) {
  // console.log('draw:started')
  interactPlugin.disable()
})

interactiveMap.on('draw:editstart', function (event) {
  console.log('draw:editstart', event)
})

interactiveMap.on('draw:created', function (event) {
  console.log('draw:created', event)
  interactiveMap.toggleButtonState('geometryActions', 'hidden', false)
  interactPlugin.enable()
})

interactiveMap.on('draw:updated', function (event) {
  console.log('draw:updated', event)
})

interactiveMap.on('draw:edited', function (event) {
  // console.log('draw:edited', event)
  interactiveMap.toggleButtonState('geometryActions', 'hidden', false)
  interactPlugin.enable()
})

interactiveMap.on('draw:cancelled', function (event) {
  console.log('draw:cancelled', event)
  interactiveMap.toggleButtonState('geometryActions', 'hidden', false)
  interactPlugin.enable()
})


interactiveMap.on('interact:selectionchange', function (event) {
  // mergeShapes deliberately excludes points — merging is a polygon/line-only concept.
  // editShape and delete both apply to a point (edit_point relocates it; delete removes the
  // whole feature), so they share the wider layer list.
  const drawLayers = ['stroke-inactive.cold', 'fill-inactive.cold']
  const editableLayers = drawLayers.concat(['point-symbol.cold'])
  const deletableLayers = editableLayers
  const singleFeature = event.selectedFeatures.length === 1
  const anyFeature = event.selectedFeatures.length > 0
  const isDrawFeature = singleFeature && editableLayers.includes(event.selectedFeatures[0].layerId)
  const isPolygon = singleFeature && event.selectedFeatures[0].geometryType === 'Polygon'
  const allDrawFeatures = anyFeature && event.selectedFeatures.every(function (f) { return drawLayers.includes(f.layerId) })
  const canDelete = anyFeature && event.selectedFeatures.every(function (f) { return deletableLayers.includes(f.layerId) })
  const canMerge = allDrawFeatures && event.contiguous && event.selectedFeatures.length > 1
  selectedFeatureIds = event.selectedFeatures.map(function (f) { return f.featureId })
  interactiveMap.toggleButtonState('addPoint', 'disabled', !!anyFeature)
  interactiveMap.toggleButtonState('drawPolygon', 'disabled', !!anyFeature)
  interactiveMap.toggleButtonState('drawLine', 'disabled', !!anyFeature)
  interactiveMap.toggleButtonState('editShape', 'disabled', !isDrawFeature)
  interactiveMap.toggleButtonState('splitShape', 'disabled', !isPolygon)
  interactiveMap.toggleButtonState('mergeShapes', 'disabled', !canMerge)
  interactiveMap.toggleButtonState('deleteFeature', 'disabled', !canDelete)
})

interactiveMap.on('draw:split', function (event) {
  // console.log('draw:split', { originalFeatureId: event.originalFeatureId, newFeatures: event.featureCollection.features })

  // Delete the original polygon
  drawPlugin.deleteFeature([event.originalFeatureId])

  // Add the two new split features with IDs based on the original
  event.featureCollection.features.forEach(function (feature, index) {
    const newId = event.originalFeatureId + (index === 0 ? '-a' : '-b')
    drawPlugin.addFeature({
      id: newId,
      type: feature.type,
      geometry: feature.geometry,
      properties: feature.properties
    })
  })

  interactPlugin.clear()
})

interactiveMap.on('draw:merge', function (event) {
  // console.log('draw:merge', { originalFeatureIds: event.originalFeatureIds, feature: event.feature })

  // Delete the original polygons
  drawPlugin.deleteFeature(event.originalFeatureIds)

  // Add the single merged feature, keeping the first original's id
  drawPlugin.addFeature({
    id: event.originalFeatureIds[0],
    type: event.feature.type,
    geometry: event.feature.geometry,
    properties: event.feature.properties
  })
})

interactiveMap.on('interact:markerchange', function (event) {
  // console.log('interact:markerchange', event)
})

// Update selected feature
interactiveMap.on('search:match', function (event) {
  if (event.type !== 'parcel') {
    return
  }
  interactPlugin.selectFeature({
    idProperty: 'id',
    featureId: event.properties.ngc,
    layerId: 'linked-parcels'
  })
})

// Hide selected feature
interactiveMap.on('search:clear', function (event) {
  // console.log('Search clear')
})

interactiveMap.on('app:continue', function (payload) {
  console.log('app:continue')
  console.log(payload)
})
