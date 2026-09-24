import InteractiveMap from '../../src/index.js'
import { vtsMapStyles27700 } from './mapStyles.js'
import { transformGeocodeRequest, transformVtsRequest27700 } from './auth.js'
// Providers
import openLayersProvider from '/providers/beta/openlayers/src/index.js'
import openNamesProvider from '/providers/beta/open-names/src/index.js'
// Plugins
import mapStylesPlugin from '/plugins/beta/map-styles/src/index.js'
import createDatasetsPlugin from '/plugins/datasets/src/index.js'
import createMapKeyPlugin from '/plugins/map-key/src/index.js'
import searchPlugin from '/plugins/search/src/index.js'
import createInteractPlugin from '/plugins/interact/src/index.js'

const FARMING_TILES_URL = 'https://farming-tiles-702a60f45633.herokuapp.com'
const FARMING_API_URL = process.env.FARMING_API_URL
const SBI = 106325052 // Same farm as demo/js/index.js's land-covers
const HIGHLIGHTED_SBI = '106223377' // Same farm as demo/js/index.js's existing-fields/hedge-control

// Bounds from demo/js/index.js's [-2.450804, 54.5599279, -2.403804, 54.6199279] (WGS84),
// converted to EPSG:27700 via this same API's /convert-to-osgb36 endpoint.
const BOUNDS = [370945, 518391, 374023, 525049]

// Same 5 points as index.js's pointData, converted from WGS84 to EPSG:27700.
// No id/idProperty here — click-to-select instead reads the interact plugin's own per-layer
// idProperty: 'name' (see interactPlugin below), since 'name' is already unique per feature.
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
    layerId: 'land-covers-110',
    labelProperty: 'ngc'
  }, {
    layerId: 'land-covers-130-131',
    labelProperty: 'ngc'
  }, {
    layerId: 'land-covers-332',
    labelProperty: 'ngc'
  }, {
    layerId: 'land-covers-379',
    labelProperty: 'ngc'
  }, {
    layerId: 'land-covers-other',
    labelProperty: 'ngc'
  }, {
    layerId: 'existing-fields',
    labelProperty: 'ngc'
  }, {
    // Exercises the tiles-backed-dataset click/hover/highlight fix — previously broken for
    // any 'vectorTile'-tagged OL layer without a MapLibre-style 'mapbox-layer' feature
    // property (see hoverCursor.js/highlightFeatures.js/vtTileFragments.js).
    layerId: 'hedge-control'
  }, {
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
  }],
  interactionModes: ['selectMarker', 'selectFeature'],
  multiSelect: true,
  deselectOnClickOutside: true
})

const datasetsPlugin = createDatasetsPlugin({
  datasets: [{
    id: 'land-covers',
    label: 'Land covers',
    // One-time fetch (like MapLibre's own geojson: url source) — see setData()/dynamicGeoJSON
    // for the viewport-refetching alternative, used below by hedge-control instead.
    geojson: `${FARMING_API_URL}/api/collections/parcels/items?sbi=${SBI}&crs=27700&limit=1000`,
    showInKey: true,
    showInMenu: true,
    style: {
      // No fill here — each sublayer's filter picks its own colour; a dominant_land_cover
      // value always matches exactly one of the five sublayers below.
    },
    sublayers: [{
      id: '130-131',
      label: 'Permanent grassland',
      filter: ['in', ['get', 'dominant_land_cover'], ['literal', ['130', '131']]],
      showInMenu: true,
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
        fillPattern: 'vertical-hatch',
        fillPatternForegroundColor: { outdoor: '#1565C0', dark: '#ffffff' },
        fillPatternBackgroundColor: 'transparent'
      }
    }]
  }, {
    id: 'existing-fields',
    label: 'Existing fields',
    tiles: [`${FARMING_TILES_URL}/field_parcels_with_hedges_osgb36/{z}/{x}/{y}`],
    sourceLayer: 'field_parcels_osgb36',
    filter: ['all', ['==', ['get', 'sbi'], HIGHLIGHTED_SBI], ['==', ['get', 'is_dominant_land_cover'], true]],
    // BNG zoom levels aren't comparable to Web Mercator ones (a BNG zoom-0 tile covers ~31x less
    // ground) — index.js's minZoom:10/maxZoom:24 (Mercator) become roughly minZoom:5/maxZoom:19
    // here, per the farming-tiles server's own conversion guidance. Tune to taste.
    minZoom: 5,
    maxZoom: 19,
    showInKey: true,
    showInMenu: true,
    style: {
      // Same rgba() approach as index.js's fill: 'rgba(21,101,192,0.1)' — the Key panel's
      // plain-rect swatch (KeySvgRect.jsx) renders style.fill as-is and never applies a
      // separate opacity value (that's a map-layer-level concept), so translucency has to be
      // baked into the colour itself to show correctly in both the Key and the map.
      stroke: { outdoor: '#1565C0', dark: '#ffffff' },
      strokeWidth: 2,
      fill: 'rgba(21,101,192,0.15)'
    }
  }, {
    id: 'hedge-control',
    label: 'Hedge control',
    tiles: [`${FARMING_TILES_URL}/field_parcels_with_hedges_osgb36/{z}/{x}/{y}`],
    sourceLayer: 'hedge_control',
    minZoom: 5,
    maxZoom: 19,
    showInKey: true,
    showInMenu: true,
    style: {
      stroke: '#b58840',
      strokeWidth: 4,
      // Without this, the Key panel's default rect swatch would show for a line-only
      // dataset — same as index.js's hedge-control.
      keySymbolShape: 'line'
    }
  }, {
    id: 'historic-monuments',
    label: 'Historic monuments',
    geojson: POINT_DATA,
    showInKey: true,
    showInMenu: true,
    style: {
      symbol: 'pin',
      symbolGraphic: 'M3 15H1V1h2v2h2V1h2v5h2V4h2v2h2V4h2v11H6V9H3v6z' // Historic monument
    },
    sublayers: [{
      id: 'prehistoric',
      label: 'Prehistoric',
      // ['literal', [...]] wraps the array here (unlike index.js's own bare-string form) — OL's
      // expression parser requires a real array as the 'in' operator's second argument, where
      // MapLibre also tolerates a bare scalar.
      filter: ['in', ['get', 'category'], ['literal', ['prehistoric']]],
      showInMenu: true,
      style: { symbol: 'circle', symbolSize: 'small', symbolBackgroundColor: '#00897B' }
    }, {
      id: 'roman',
      label: 'Roman',
      filter: ['in', ['get', 'category'], ['literal', ['roman']]],
      showInMenu: true,
      style: { symbol: 'square', symbolBackgroundColor: '#ca3535' }
    }, {
      id: 'medieval',
      label: 'Medieval',
      filter: ['in', ['get', 'category'], ['literal', ['medieval']]],
      showInMenu: true,
      style: { symbol: 'hexagon', symbolBackgroundColor: '#1565C0' }
    }, {
      id: 'industrial',
      label: 'Industrial',
      filter: ['in', ['get', 'category'], ['literal', ['industrial']]],
      showInMenu: true,
      style: { symbol: 'triangle', symbolSize: 'large', symbolBackgroundColor: '#54319f' }
    }, {
      id: 'modern',
      label: 'Modern',
      filter: ['in', ['get', 'category'], ['literal', ['modern']]],
      showInMenu: true,
      style: { symbol: 'diamond', symbolBackgroundColor: '#d53880' }
    }]
  }]
})

const interactiveMap = new InteractiveMap('map', {
  behaviour: 'hybrid',
  mapProvider: openLayersProvider(),
  reverseGeocodeProvider: openNamesProvider({
    url: process.env.OS_NEAREST_URL,
    transformRequest: transformGeocodeRequest
  }),
  mapLabel: 'Map showing field parcels and land use (OpenLayers)',
  minZoom: 6,
  maxZoom: 20,
  autoColorScheme: true,
  bounds: BOUNDS,
  containerHeight: '650px',
  transformRequest: transformVtsRequest27700,
  enableZoomControls: false,
  readMapText: true,
  enableFullscreen: true,
  plugins: [
    searchPlugin({
      transformRequest: transformGeocodeRequest,
      osNamesURL: process.env.OS_NAMES_URL,
      width: '300px',
      showMarker: true,
      showLabel: true
    }),
    datasetsPlugin,
    createMapKeyPlugin(),
    mapStylesPlugin({
      mapStyles: vtsMapStyles27700
    }),
    interactPlugin
  ]
})

interactiveMap.on('app:ready', function (e) {
  interactiveMap.showHint('My hint', { duration: 0 })
})

interactiveMap.on('map:ready', function (e) {
  interactPlugin.enable()
  // Same two demo markers as index.js's, converted from its WGS84 coordinates to EPSG:27700
  // the same way POINT_DATA is above.
  interactiveMap.addMarker('my-marker-1', [370642, 519019], { label: 'My label', showLabel: true })
  interactiveMap.addMarker('my-marker-2', [370925, 518827], { label: 'Another marker', symbol: 'square' })
})

interactiveMap.on('interact:selectionchange', function (e) {
  console.log('interact:selectionchange', e)
})
