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

const pointData = {type: 'FeatureCollection',features: [{type: 'Feature',properties: {category:'prehistoric'},geometry: {coordinates: [-2.4558622,54.5617135],type: 'Point'}},{type: 'Feature',properties: {category:'roman'},geometry: {coordinates: [-2.439823,54.5525437],type: 'Point'}},{type: 'Feature',properties: {category:'medieval'},geometry: {coordinates: [-2.4481939,54.5575261],type: 'Point'}}]}

const interactPlugin = createInteractPlugin({
	dataLayers: [{
		layerId: 'historic-monuments-prehistoric-symbol',
		// idProperty: 'gid'
	},{
		layerId: 'land-covers-110',
		// idProperty: 'gid'
	},{
		layerId: 'land-covers-130-131',
		// idProperty: 'gid'
	},{
		layerId: 'land-covers-332',
		// idProperty: 'gid'
	},{
		layerId: 'land-covers-379',
		// idProperty: 'gid'
	},{
		layerId: 'land-covers-other',
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
	// Example: Dynamic bbox-based fetching (uncomment to test)
	datasets: [
	{
		id: 'land-covers',
		label: 'Land covers',
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
		sublayers: [{
			id: '130-131',
			label: 'Permanent grassland',
			filter: ['in', ['get', 'dominant_land_cover'], ['literal', ['130', '131']]], // 'dominant_land_cover = "130"'
			toggleVisibility: true,
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
			toggleVisibility: true,
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
			toggleVisibility: true,
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
			toggleVisibility: true,
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
			toggleVisibility: true,
			style: {
				stroke: { outdoor: '#1565C0', dark: '#ffffff' },
				fill: 'rgba(0,0,255,0.1)',
				fillPattern: 'vertical-hatch',
				fillPatternForegroundColor: { outdoor: '#1565C0', dark: '#ffffff' }
				// fillPatternBackgroundColor: 'transparent'
			}
		}]
	},
	{
		id: 'existing-fields',
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
			stroke: { outdoor: '#1565C0', dark: '#ffffff'},
			strokeWidth: 2,
			fill: 'rgba(21,101,192,0.1)',
			symbolDescription: { outdoor: 'blue outline', dark: 'white outline' }
		}
	},{
		id: 'historic-monuments',
		label: 'Historic monuments',
		geojson: pointData,
		minZoom: 10,
		maxZoom: 24,
		showInKey: true,
		toggleVisibility: true,
		style: {
			symbol: 'square',
			symbolGraphic: 'M3 15H1V1h2v2h2V1h2v5h2V4h2v2h2V4h2v11H6V9H3v6z', // Historic monument
			// symbolBackgroundColor: { outdoor: '#ca3535', dark: '#ffffff' },
			// symbolForegroundColor: { outdoor: '#ffffff', dark: '#0b0c0c' }
		},
		sublayers: [{
			id: 'prehistoric',
			label: 'Prehistoric',
			filter: ['in', ['get', 'category'], 'prehistoric'],
			toggleVisibility: true,
			style: {
				symbolBackgroundColor: '#00897B',
			}
		},{
			id: 'roman',
			label: 'Roman',
			filter: ['in', ['get', 'category'], 'roman'],
			toggleVisibility: true,
			style: {
				symbolBackgroundColor: '#ca3535',
			}
		},{
			id: 'medieval',
			label: 'Medieval',
			filter: ['in', ['get', 'category'], 'medieval'],
			toggleVisibility: true,
			style: {
				symbolBackgroundColor: '#1565C0',
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
		style: {
			stroke: '#b58840',
			fill: 'transparent',
			strokeWidth: 4,
			symbolDescription: { outdoor: 'blue outline' },
			keySymbolShape: 'line',
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
	// symbolDefaults: {
	// 	symbol: 'circle',
	// 	backgroundColor: { outdoor: '#1d70b8', dark: '#4c9ed9' },
	// 	haloColor: { outdoor: '#ffffff', dark: '#0b0c0c' },
	// 	selectedColor: { outdoor: '#ffdd00', dark: '#ffaa00' }
	// },
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
			showMarker: true,
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
	// setTimeout(() => datasetsPlugin.setFeatureVisibility(false, [55], { datasetId: 'land-covers', idProperty: null }), 2000)
	// setTimeout(() => datasetsPlugin.setFeatureVisibility(true, [55], { datasetId: 'land-covers', idProperty: null }), 4000)
	// setTimeout(() => datasetsPlugin.setStyle({ stroke: { outdoor: '#ff0000', dark: '#ffffff' }, fillPattern: 'horizontal-hatch', fillPatternForegroundColor: { outdoor: '#ff0000', dark: '#ffffff' } }, { datasetId: 'land-covers', sublayerId: '130' }), 2000)
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
		layerId: 'existing-fields'
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