// CSS
// import '../../dist/css/index.css'
// import '/plugins/beta/map-styles/dist/css/index.css'
// import '/plugins/beta/datasets/dist/css/index.css'
// import '/plugins/beta/draw-ml/dist/css/index.css'
// import '/plugins/beta/scale-bar/dist/css/index.css'
// import '/plugins/search/dist/css/index.css'
// import '/plugins/interact/dist/css/index.css'
// import '/plugins/beta/frame/dist/css/index.css'
// InteractiveMap
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
// import createDrawPlugin from '/plugins/beta/draw-ml/src/index.js'
import scaleBarPlugin from '/plugins/beta/scale-bar/src/index.js'
import searchPlugin from '/plugins/search/src/index.js'
import createInteractPlugin from '/plugins/interact/src/index.js'
import createFramePlugin from '/plugins/beta/frame/src/index.js'

const pointData = {type: 'FeatureCollection','features': [{'type': 'Feature','properties': {},'geometry': {'coordinates': [-2.882445487962059,54.70938250564518],'type': 'Point'}},{'type': 'Feature','properties': {},'geometry': {'coordinates': [-2.8775970686837695,54.70966586215056],'type': 'Point'}},{'type': 'Feature','properties': {},'geometry': {'coordinates': [-2.8732152153681056,54.70892223300439],'type': 'Point'}}]}

const interactPlugin = createInteractPlugin({
	dataLayers: [{
		layerId: 'field-parcels-130',
		// idProperty: 'gid'
	},{
		layerId: 'field-parcels-332',
		// idProperty: 'gid'
	},{
		layerId: 'field-parcels-other',
		// idProperty: 'gid'
	},{
		layerId: 'OS/TopographicArea_1/Agricultural Land',
		idProperty: 'TOID'
	},{
		layerId: 'fill-inactive.cold',
		idProperty: 'id'
	},{
		layerId: 'stroke-inactive.cold',
		idProperty: 'id'
	}],
	debug: true,
	interactionMode: 'select', // 'auto', 'select', 'marker' // defaults to 'marker'
	multiSelect: true,
	contiguous: true,
	deselectOnClickOutside: true
})

const framePlugin = createFramePlugin({
	aspectRatio: 1.5
})

const datasetsPlugin = createDatasetsPlugin({
	layerAdapter: maplibreLayerAdapter,
	// datasets: [{
	// 	id: 'linked-parcels',
	// 	label: 'Existing fields',
	// 	// Static GeoJSON - fetched once (current behaviour)
	// 	geojson: `${process.env.FARMING_API_URL}/api/collections/parcels/items?sbi=106170272`,
	// 	stroke: '#0000ff',
	// 	strokeWidth: 2,
	// 	fill: 'rgba(0,0,255,0.1)',
	// 	symbolDescription: { outdoor: 'blue outline' },
	// 	minZoom: 10,
	// 	maxZoom: 24,
	// 	showInKey: true,
	// 	toggleVisibility: true
	// },{
	// 	id: 'permanent-grassland',
	// 	label: 'Permanent grassland',
	// 	geojson: `${process.env.FARMING_API_URL}/api/collections/land-covers/items?code=130&sbi=106170272`,
	// 	stroke: '#00703c',
	// 	strokeWidth: 2,
	// 	fill: 'rgba(0,112,60,0.1)',
	// 	symbolDescription: { outdoor: 'Green outline' },
	// 	minZoom: 10,
	// 	maxZoom: 24,
	// 	showInKey: true,
	// 	toggleVisibility: true,
	// 	visibility: 'hidden'
	// }]
	
	// Example: Dynamic bbox-based fetching (uncomment to test)
	datasets: [{
		id: 'field-parcels',
		label: 'Field parcels',
		geojson: `${process.env.FARMING_API_URL}/api/collections/parcels/items?sbi=106325052`, // 106200212
		// filter: [
		// 	'all',
		// 	['!=', ['get', 'sbi'], '106223377'],
		// 	['==', ['get', 'is_dominant_land_cover'], true]
		// ],
		// tiles: ['https://farming-tiles-702a60f45633.herokuapp.com/field_parcels_with_hedges/{z}/{x}/{y}'],
		// sourceLayer: 'field_parcels_filtered',
		// featureLayer: '',
		// idProperty: 'id',  // Enables dynamic fetching + deduplication
		// filter: ['get', ['propertyName', 'warning']],
		query: {},
		transformRequest: transformDataRequest,  // Builds URL with bbox
		maxFeatures: 50000,  // Optional: evict distant features when exceeded
		minZoom: 10,
		maxZoom: 24,
		showInKey: true,
		toggleVisibility: true,
		// visibility: 'hidden',
		// style: {
		// 	stroke: { outdoor: '#0000ff', dark: '#ffffff' },
		// 	strokeWidth: 2,
		// 	symbol: '',
		// 	symbolSvgContent: '',
		// 	symbolForegroundColor: '',
		// 	symbolBackgroundColor: '',
		// 	symbolDescription: { outdoor: 'blue outline' },
		// 	symbolOffset: [],
		// 	fill: 'rgba(0,0,255,0.1)',
		// 	fillPattern: 'diagonal-cross-hatch',
		// 	fillPatternForegroundColor: { outdoor: '#0000ff', dark: '#ffffff' },
		// 	fillPatternBackgroundColor: 'transparent'
		// },
		sublayers: [{
			id: '130',
			label: 'Permanent grassland',
			filter: ['==', ['get', 'dominant_land_cover'], '130'], // 'dominant_land_cover = "130"'
			toggleVisibility: true,
			style: {
				stroke: { outdoor: '#82F584', dark: '#ffffff' },
				fillPattern: 'diagonal-cross-hatch',
				fillPatternForegroundColor: { outdoor: '#82F584', dark: '#ffffff' },
				fillPatternBackgroundColor: 'transparent'
			}
		},{
			id: '332',
			label: 'Woodland',
			filter: ['==', ['get', 'dominant_land_cover'], '332'],
			toggleVisibility: true,
			style: {
				stroke: { outdoor: '#66CA7A', dark: '#ffffff' },
				fillPattern: 'dot',
				fillPatternForegroundColor: { outdoor: '#66CA7A', dark: '#ffffff' },
				fillPatternBackgroundColor: 'transparent'
			}
		},{
			id: 'other',
			label: 'Others',
			filter: ['!', ['in', ['get', 'dominant_land_cover'], ['literal', ['130', '332']]]],
			toggleVisibility: true,
			style: {
				stroke: { outdoor: '	#1d70b8', dark: '#ffffff' },
				fill: 'rgba(0,0,255,0.1)',
				fillPattern: 'vertical-hatch',
				fillPatternForegroundColor: { outdoor: '#1d70b8', dark: '#ffffff' },
				// fillPatternBackgroundColor: 'transparent'
			}
		}]
	},{
		id: 'hedge-control',
		label: 'Hedge control',
		// groupLabel: 'Test group',
		tiles: ['https://farming-tiles-702a60f45633.herokuapp.com/field_parcels_with_hedges/{z}/{x}/{y}'],
		sourceLayer: 'hedge_control',
		minZoom: 10,
		maxZoom: 24,
		showInKey: true,
		toggleVisibility: true,
		visibility: 'hidden',
		keySymbolShape: 'line',
		style: {
			stroke: '#b58840',
			fill: 'transparent',
			strokeWidth: 4,
			symbolDescription: { outdoor: 'blue outline' }
		}
	},{
		id: 'linked-parcels',
		label: 'Existing fields',
		// groupLabel: 'Test group',
		filter: ['all',['==', ['get', 'sbi'], '106223377'],['==', ['get', 'is_dominant_land_cover'], true]],
		tiles: ['https://farming-tiles-702a60f45633.herokuapp.com/field_parcels_with_hedges/{z}/{x}/{y}'],
		sourceLayer: 'field_parcels_filtered',
		minZoom: 10,
		maxZoom: 24,
		showInKey: true,
		toggleVisibility: true,
		style: {
			stroke: '#0000ff',
			strokeWidth: 2,
			fill: 'rgba(0,0,255,0.1)',
			symbolDescription: { outdoor: 'blue outline' }
		}
	}]
})

const interactiveMap = new InteractiveMap('map', {
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
	containerHeight: '650px',
	transformRequest: transformTileRequest,
	enableZoomControls: true,
	readMapText: true,
	// enableFullscreen: true,
	// hasExitButton: true,
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
			showMarker: false,
			// expanded: true
		}),
		// useLocationPlugin(),
		interactPlugin,
		framePlugin
	]
	// search
})

interactiveMap.on('app:ready', function (e) {
	// console.log('app:ready')
})

interactiveMap.on('map:ready', function (e) {
	// framePlugin.addFrame('test', {
	// 	aspectRatio: 1
	// })
	interactPlugin.enable()
})

interactiveMap.on('datasets:ready', function () {
	// setTimeout(() => datasetsPlugin.hideFeatures({ featureIds: [55], idProperty: null, datasetId: 'field-parcels' }), 2000)
	// setTimeout(() => datasetsPlugin.showFeatures({ featureIds: [55], idProperty: null, datasetId: 'field-parcels' }), 4000)
	// setTimeout(() => datasetsPlugin.setSublayerStyle({ datasetId: 'field-parcels', sublayerId: '130', style: { stroke: { outdoor: '#ff0000', dark: '#ffffff' }, fillPattern: 'horizontal-hatch', fillPatternForegroundColor: { outdoor: '#ff0000', dark: '#ffffff' } } }), 2000)
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
	interactPlugin.selectFeature({
		idProperty: 'id',
		featureId: e.properties.ngc,
		layerId: 'linked-parcels'
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
})

interactiveMap.on('frame:cancel', function (e) {
	console.log('frame:cancel')
	console.log(e)
})