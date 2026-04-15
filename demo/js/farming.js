import InteractiveMap from '../../src/index.js'
import { openMapStyles, vtsMapStyles3857 } from './mapStyles.js'
import { parcelSearch, gridRefSearchETRS89 } from './searchCustomDatasets.js'
import { transformGeocodeRequest, transformTileRequest, transformDataRequest } from './auth.js'
// Providers
import maplibreProvider from '/providers/maplibre/src/index.js'
import openNamesProvider from '/providers/beta/open-names/src/index.js'
// Plugins
import useLocationPlugin from '/plugins/beta/use-location/src/index.js'
import mapStylesPlugin from '/plugins/beta/map-styles/src/index.js'
import createDatasetsPlugin from '/plugins/beta/datasets/src/index.js'
import { maplibreLayerAdapter } from '/plugins/beta/datasets/src/adapters/maplibre/index.js'
import createDrawPlugin from '/plugins/beta/draw-ml/src/index.js'
import scaleBarPlugin from '/plugins/beta/scale-bar/src/index.js'
import searchPlugin from '/plugins/search/src/index.js'
import createInteractPlugin from '/plugins/interact/src/index.js'
import createFramePlugin from '/plugins/beta/frame/src/index.js'

var feature = { id: 'test1234', type: 'Feature', geometry: { coordinates: [[[-2.9406643378873127,54.918060570259456],[-2.9092219779267054,54.91564249172612],[-2.904350626383433,54.90329530000005],[-2.909664828067463,54.89540129642464],[-2.9225074821353587,54.88979816151294],[-2.937121536764323,54.88826989853317],[-2.95682836800691,54.88916139231736],[-2.965463945742613,54.898966521920045],[-2.966349646023133,54.910805898763385],[-2.9406643378873127,54.918060570259456]]], type: 'Polygon' }}

var interactPlugin = createInteractPlugin({
	layers: [{
		layerId: 'field-parcels',
		// idProperty: 'gid'
	},{
		layerId: 'linked-parcels',
		// idProperty: 'gid'
	}],
	interactionModes: ['selectMarker', 'selectFeature', 'placeMarker'], // e.g. ['selectMarker'], ['selectFeature'], ['placeMarker'], or combinations
	multiSelect: true,
	// excludeModes: ['draw']
})

var datasetsPlugin = createDatasetsPlugin({
	layerAdapter: maplibreLayerAdapter,
	datasets: [{
		id: 'field-parcels',
		label: 'Field parcels',
		geojson: `${process.env.FARMING_API_URL}/api/collections/parcels/items?sbi=106325052`, // 106200212
		transformRequest: transformDataRequest,
		maxFeatures: 50000,
		// filter: [
		// 	'all',
		// 	['!=', ['get', 'sbi'], '106223377'],
		// 	['==', ['get', 'is_dominant_land_cover'], true]
		// ],
		// tiles: ['https://farming-tiles-702a60f45633.herokuapp.com/field_parcels_with_hedges/{z}/{x}/{y}'],
		// sourceLayer: 'field_parcels_filtered',
		// featureLayer: '',
		// vectorTileLayer: '',
		minZoom: 10,
		maxZoom: 24,
		showInKey: true,
		toggleVisibility: true,
		style: {
			stroke: { outdoor: '#0000ff', dark: '#ffffff' },
			strokeWidth: 2,
			fill: 'rgba(0,0,255,0.1)',
			fillPattern: 'diagonal-cross-hatch',
			fillPatternForegroundColor: { outdoor: '#0000ff', dark: '#ffffff' },
			fillPatternBackgroundColor: 'transparent',
			opacity: 0.5
		}
	}
]})

var drawPlugin = createDrawPlugin()

let framePlugin = createFramePlugin({
	aspectRatio: 1.5
})

var interactiveMap = new InteractiveMap('map', {
	behaviour: 'hybrid',
	mapProvider: maplibreProvider(),
	reverseGeocodeProvider: openNamesProvider({
		url: process.env.OS_NEAREST_URL,
		// url: '/api/os-nearest-proxy?query={query}',
		transformRequest: transformGeocodeRequest
		// showMarker: true
	}),
	// maxMobileWidth: 700,
	// minDesktopWidth: 960,
	mapLabel: 'Map showing Carlisle',
	// zoom: 14,
	minZoom: 6,
	maxZoom: 20,
	autoColorScheme: true,
	// center: [-2.938769, 54.893806],
	bounds: [-2.989707, 54.864555, -2.878635, 54.937635],
	containerHeight: '500px',
	transformRequest: transformTileRequest,
	// enableFullscreen: true,
	hasExitButton: true,
	preserveStateOnClose: true,
	// markers: [{
	// 	id: 'location',
	// 	coords: [-2.9592267, 54.9045977],
	// 	color: { outdoor: '#ff0000', dark: '#00ff00' }
	// }],
	mapStyle: {
		url: process.env.OUTDOOR_URL,
		logo: '/assets/images/os-logo.svg',
		logoAltText: 'Ordnance survey logo',
		attribution: `Contains OS data ${String.fromCharCode(169)} Crown copyright and database rights ${(new Date()).getFullYear()}`,
		backgroundColor: '#f5f5f0'
	},
	plugins: [
		scaleBarPlugin({
			units: 'metric'
		}),
		searchPlugin({
			transformRequest: transformGeocodeRequest,
			osNamesURL: process.env.OS_NAMES_URL,
			customDatasets: [parcelSearch, gridRefSearchETRS89],
			width: '300px',
			showMarker: false,
			// expanded: true
		}),
		// useLocationPlugin(),
		datasetsPlugin,
		mapStylesPlugin({
			mapStyles: vtsMapStyles3857
		}),
		interactPlugin,
		// framePlugin,
		// drawPlugin
	]
	// search
})

interactiveMap.on('map:ready', function (e) {
	// interactiveMap.setMode('draw')
	// framePlugin.addFrame('test', {
	// 	aspectRatio: 1
	// })
	interactPlugin.enable()
	// interactPlugin.selectFeature({
	// 	idProperty: 'ngc',
	// 	featureId: 'NY70197424',
	// 	layerId: 'field-parcels'
	// })
	// interactPlugin.unselectFeature({
	// 	idProperty: 'ngc',
	// 	featureId: 'NY70197424',
	// 	layerId: 'field-parcels'
	// })
})

interactiveMap.on('draw:ready', function () {
	// drawPlugin.newPolygon('test')
	// drawPlugin.addFeature(feature)
	// drawPlugin.editFeature('test1234')
})

interactiveMap.on('interact:done', function (e) {
	console.log('interact:done', e)
})

interactiveMap.on('interact:cancel', function (e) {
	console.log('interact:cancel', e)
})

interactiveMap.on('interact:selectionchange', function (e) {
	console.log('interact:selectionchange', e)
})

interactiveMap.on('interact:markerchange', function (e) {
	console.log('interact:markerchange', e)
})

// Update selected feature
interactiveMap.on('search:match', function (e) {
	if (e.type !== 'parcel') {
		return
	}
	interactPlugin.selectFeature({
		idProperty: 'ngc',
		featureId: e.properties.ngc,
		layerId: 'field-parcels'
	})
})

// Hide selected feature
interactiveMap.on('search:clear', function (e) {
	// console.log('Search clear')
})

// Frame events
interactiveMap.on('frame:done', function (e) {
	console.log('frame:done')
	drawPlugin.addFeature(e)
	setTimeout(() => {
		framePlugin.editFeature(e)
	}, 3000)
})

interactiveMap.on('frame:cancel', function (e) {
	console.log('frame:cancel')
	console.log(e)
})