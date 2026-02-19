import InteractiveMap from '../../src/index.js'
import { openMapStyles, vtsMapStyles3857 } from './mapStyles.js'
import { searchCustomDatasets } from './searchCustomDatasets.js'
import { transformGeocodeRequest, transformTileRequest, transformDataRequest } from './auth.js'
// Providers
import maplibreProvider from '/providers/maplibre/src/index.js'
import openNamesProvider from '/providers/beta/open-names/src/index.js'
// Plugins
import useLocationPlugin from '/plugins/beta/use-location/src/index.js'
import mapStylesPlugin from '/plugins/beta/map-styles/src/index.js'
import createDatasetsPlugin from '/plugins/beta/datasets/src/index.js'
import createDrawPlugin from '/plugins/beta/draw-ml/src/index.js'
import scaleBarPlugin from '/plugins/beta/scale-bar/src/index.js'
import searchPlugin from '/plugins/search/src/index.js'
import createInteractPlugin from '/plugins/interact/src/index.js'
import createFramePlugin from '/plugins/beta/frame/src/index.js'

var interactPlugin = createInteractPlugin({
	dataLayers: [{
		layerId: 'field-parcels',
		// idProperty: 'id'
	},{
		layerId: 'linked-parcels',
		// idProperty: 'id'
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
	interactionMode: 'select', // 'auto', 'select', 'marker' // defaults to 'marker'
	multiSelect: true,
	contiguous: true
})

var drawPlugin = createDrawPlugin({
	snapLayers: ['OS/TopographicArea_1/Agricultural Land', 'OS/TopographicLine/Building Outline']
})

var framePlugin = createFramePlugin({
	aspectRatio: 1.5
})

var datasetsPlugin = createDatasetsPlugin({
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
	// 	showInLayers: true
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
	// 	showInLayers: true,
	// 	visibility: 'hidden'
	// }]

	// Example: Dynamic bbox-based fetching (uncomment to test)
	datasets: [{
		id: 'field-parcels',
		label: 'Field parcels',
		geojson: `${process.env.FARMING_API_URL}/api/collections/parcels/items?sbi=106325052`, // 106200212
		idProperty: 'id',  // Enables dynamic fetching + deduplication
		transformRequest: transformDataRequest,  // Builds URL with bbox
		maxFeatures: 50000,  // Optional: evict distant features when exceeded
		stroke: '#0000ff',
		strokeWidth: 2,
		fill: 'rgba(0,0,255,0.1)',
		symbolDescription: { outdoor: 'blue outline' },
		minZoom: 10,
		maxZoom: 24,
		showInKey: true,
		showInLayers: true
	}]
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
		// scaleBarPlugin({
		// 	units: 'metric'
		// }),
		searchPlugin({
			transformRequest: transformGeocodeRequest,
			osNamesURL: process.env.OS_NAMES_URL,
			customDatasets: searchCustomDatasets,
			width: '300px',
			showMarker: false,
			// isExpanded: true
		}),
		// useLocationPlugin(),
		interactPlugin,
		framePlugin,
		drawPlugin
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
	interactiveMap.addButton('geometryActions', {
		label: 'Actions',
		variant: 'tertiary',
		iconSvgContent: '<path d="m6 9 6 6 6-6"/>',
		mobile: { slot: 'actions', order: 2, showLabel: true },
		tablet: { slot: 'actions', order: 2, showLabel: true },
		desktop: { slot: 'actions', order: 2, showLabel: true },
		menuItems: [{
			id: 'drawPolygon2',
			label: 'Draw polygon',
			iconSvgContent: '<path d="M19.5 7v10M4.5 7v10M7 19.5h10M7 4.5h10"/><path d="M22 18v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zm0-15v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 18v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 3v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1z"/>',
			isPressed: false,
			onClick: function (e) {
				e.target.setAttribute('aria-pressed', true) 
				drawPlugin.newPolygon(crypto.randomUUID(), {
					stroke: '#e6c700',
					fill: 'rgba(255, 221, 0, 0.1)'
				})
			}
		},{
			id: 'drawLine2',
			label: 'Draw line',
			iconSvgContent: '<path d="M5.706 16.294L16.294 5.706"/><path d="M21 2v3c0 .549-.451 1-1 1h-3c-.549 0-1-.451-1-1V2c0-.549.451-1 1-1h3c.549 0 1 .451 1 1zM6 17v3c0 .549-.451 1-1 1H2c-.549 0-1-.451-1-1v-3c0-.549.451-1 1-1h3c.549 0 1 .451 1 1z"/>',
			isPressed: false,
			onClick: function (e) {
				e.target.setAttribute('aria-pressed', true)
				drawPlugin.newLine(crypto.randomUUID(), {
					stroke: { outdoor: '#99704a', dark: '#ffffff' }
				})
			}
		},{
			id: 'editFeature2',
			label: 'Edit feature',
			iconSvgContent: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
			isDisabled: true,
			onClick: function (e) {
				if (e.target.getAttribute('aria-disabled') === 'true') {
					return
				}
				interactPlugin.disable()
				drawPlugin.editFeature(selectedFeatureId)
			}
		},{
			id: 'deleteFeature2',
			label: 'Delete feature',
			iconSvgContent: '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
			isDisabled: true,
			onClick: function (e) {
				if (e.target.getAttribute('aria-disabled') === 'true') {
					return
				}
				drawPlugin.deleteFeature(selectedFeatureId)
				interactiveMap.toggleButtonState('drawPolygon', 'disabled', false)
				interactiveMap.toggleButtonState('drawLine', 'disabled', false)
				interactiveMap.toggleButtonState('editFeature', 'disabled', true)
				interactiveMap.toggleButtonState('deleteFeature', 'disabled', true)
			}
		}]
	})
})

interactiveMap.on('datasets:ready', function () {
	// datasetsPlugin.hideFeatures({
	// 	featureIds: [1148, 1134],
	// 	idProperty: 'gid',
	// 	datasetId: 'field-parcels'
	// })
})

// Ref to the selected feature
var selectedFeatureId = null

interactiveMap.on('draw:ready', function () {
	interactiveMap.addButton('drawPolygon', {
		label: 'Draw polygon',
		group: 'Drawing tools',
		iconSvgContent: '<path d="M19.5 7v10M4.5 7v10M7 19.5h10M7 4.5h10"/><path d="M22 18v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zm0-15v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 18v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 3v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1z"/>',
		isPressed: false,
		mobile: { slot: 'right-top' },
		tablet: { slot: 'right-top' },
		desktop: { slot: 'right-top' },
		onClick: function (e) {
			e.target.setAttribute('aria-pressed', true) 
			drawPlugin.newPolygon(crypto.randomUUID(), {
				stroke: '#e6c700',
				fill: 'rgba(255, 221, 0, 0.1)'
			})
		}
	})
	interactiveMap.addButton('drawLine', {
		label: 'Draw line',
		group: 'Drawing tools',
		iconSvgContent: '<path d="M5.706 16.294L16.294 5.706"/><path d="M21 2v3c0 .549-.451 1-1 1h-3c-.549 0-1-.451-1-1V2c0-.549.451-1 1-1h3c.549 0 1 .451 1 1zM6 17v3c0 .549-.451 1-1 1H2c-.549 0-1-.451-1-1v-3c0-.549.451-1 1-1h3c.549 0 1 .451 1 1z"/>',
		isPressed: false,
		mobile: { slot: 'right-top' },
		tablet: { slot: 'right-top' },
		desktop: { slot: 'right-top' },
		onClick: function (e) {
			e.target.setAttribute('aria-pressed', true)
			drawPlugin.newLine(crypto.randomUUID(), {
				stroke: { outdoor: '#99704a', dark: '#ffffff' }
			})
		}
	})
	interactiveMap.addButton('editFeature', {
		label: 'Edit feature',
		group: 'Drawing tools',
		iconSvgContent: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
		isDisabled: true,
		mobile: { slot: 'right-top' },
		tablet: { slot: 'right-top' },
		desktop: { slot: 'right-top' },
		onClick: function (e) {
			if (e.target.getAttribute('aria-disabled') === 'true') {
				return
			}
			interactPlugin.disable()
			drawPlugin.editFeature(selectedFeatureId)
		}
	})
	interactiveMap.addButton('deleteFeature', {
		label: 'Delete feature',
		group: 'Drawing tools',
		iconSvgContent: '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
		isDisabled: true,
		mobile: { slot: 'right-top' },
		tablet: { slot: 'right-top' },
		desktop: { slot: 'right-top' },
		onClick: function (e) {
			if (e.target.getAttribute('aria-disabled') === 'true') {
				return
			}
			drawPlugin.deleteFeature(selectedFeatureId)
			interactiveMap.toggleButtonState('drawPolygon', 'disabled', false)
			interactiveMap.toggleButtonState('drawLine', 'disabled', false)
			interactiveMap.toggleButtonState('editFeature', 'disabled', true)
			interactiveMap.toggleButtonState('deleteFeature', 'disabled', true)
		}
	})
	drawPlugin.addFeature({
		id: 'test1234',
		type: 'Feature',
		geometry: {'type':'Polygon','coordinates':[[[-2.8792962,54.7095463],[-2.8773445,54.7089363],[-2.8755615,54.7080257],[-2.8750521,54.7079797],[-2.8740651,54.7079522],[-2.8734760,54.7086512],[-2.8739855,54.7091846],[-2.8748292,54.7098284],[-2.8752749,54.7103526],[-2.8762460,54.7104170],[-2.8765803,54.7103342],[-2.8783315,54.7105366],[-2.8784429,54.7101319],[-2.8786499,54.7099571],[-2.8791275,54.7099112],[-2.8792962,54.7095463]],[[-2.8779654,54.7097916],[-2.8768886,54.7094843],[-2.8758538,54.7094200],[-2.8754081,54.7096223],[-2.8754559,54.7099442],[-2.8756947,54.7102201],[-2.8761404,54.7102569],[-2.8767236,54.7101963],[-2.8774559,54.7102606],[-2.8778698,54.7101135],[-2.8779654,54.7097916]]]},
		// geometry: { type: 'Polygon', coordinates: [[[-2.9406643378873127,54.918060570259456],[-2.9092219779267054,54.91564249172612],[-2.904350626383433,54.90329530000005],[-2.909664828067463,54.89540129642464],[-2.9225074821353587,54.88979816151294],[-2.937121536764323,54.88826989853317],[-2.95682836800691,54.88916139231736],[-2.965463945742613,54.898966521920045],[-2.966349646023133,54.910805898763385],[-2.9406643378873127,54.918060570259456]]] },
		stroke: 'rgba(0,112,60,1)',
		fill: 'rgba(0,112,60,0.2)',
		strokeWidth: 2
	})
	// drawPlugin.split('test1234', {
	// 	snapLayers: ['OS/TopographicArea_1/Agricultural Land']
	// })
	// drawPlugin.newPolygon('test', {
	// 	snapLayers: ['OS/TopographicArea_1/Agricultural Land']
	// })
	// drawPlugin.editFeature('test1234', {
	// 	snapLayers: ['OS/TopographicArea_1/Agricultural Land']
	// })
})

interactiveMap.on('draw:start', function (e) {
	console.log('draw:start')
	interactPlugin.disable()
})

interactiveMap.on('draw:create', function (e) {
	console.log('draw:create')
	interactPlugin.enable()
})

interactiveMap.on('draw:update', function (e) {
	console.log('draw:update')
})

interactiveMap.on('draw:edit', function (e) {
	console.log('draw:edit')
	interactPlugin.enable()
})

interactiveMap.on('draw:cancel', function (e) {
	console.log('draw:cancel')
	interactPlugin.enable()
})

interactiveMap.on('interact:done', function (e) {
	console.log('interact:done', e)
})

interactiveMap.on('interact:cancel', function (e) {
	console.log('interact:cancel', e)
	interactPlugin.enable()
})

interactiveMap.on('interact:selectionchange', function (e) {
	var singleFeature = e.selectedFeatures.length === 1
	selectedFeatureId = singleFeature ? e.selectedFeatures?.[0]?.featureId : null
	interactiveMap.toggleButtonState('drawPolygon', 'disabled', !!singleFeature)
	interactiveMap.toggleButtonState('drawLine', 'disabled', !!singleFeature)
	interactiveMap.toggleButtonState('editFeature', 'disabled', !singleFeature)
	interactiveMap.toggleButtonState('deleteFeature', 'disabled', !singleFeature)
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