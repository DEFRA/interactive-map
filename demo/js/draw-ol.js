// InteractiveMap with OpenLayers provider and draw-ol plugin
import InteractiveMap from '../../src/index.js'
import { ngdMapStyles27700 } from './mapStyles.js'
import { transformGeocodeRequest, transformVtsRequest27700 } from './auth.js'
// Providers
import openLayersProvider from '/providers/beta/openlayers/src/index.js'
import openNamesProvider from '/providers/beta/open-names/src/index.js'
// Plugins
import mapStylesPlugin from '/plugins/beta/map-styles/src/index.js'
import createDrawPlugin from '/plugins/beta/draw-ol/src/index.js'
import searchPlugin from '/plugins/search/src/index.js'

const drawPlugin = createDrawPlugin({
	snapLayers: ['OS/TopographicArea_1/Agricultural Land', 'OS/TopographicLine/Building Outline']
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
	mapLabel: 'Map showing Carlisle (OpenLayers)',
	minZoom: 6,
	maxZoom: 20,
	autoColorScheme: true,
	center: [337584, 504538],
	zoom: 14,
	containerHeight: '650px',
	transformRequest: transformVtsRequest27700,
	enableZoomControls: true,
	// readMapText: true,
	plugins: [
		mapStylesPlugin({
			mapStyles: ngdMapStyles27700
		}),
		searchPlugin({
			transformRequest: transformGeocodeRequest,
			osNamesURL: process.env.OS_NAMES_URL,
			width: '300px',
			showMarker: false,
		}),
		drawPlugin
	]
})

interactiveMap.on('app:ready', function (e) {
	// app ready
})

interactiveMap.on('map:ready', function (e) {
	interactiveMap.addButton('geometryActions', {
		label: 'Draw tools',
		mobile: { slot: 'bottom-right', order: 3 },
		tablet: { slot: 'top-middle', order: 3 },
		desktop: { slot: 'top-middle', order: 3 },
		menuItems: [{
			id: 'drawPolygon',
			label: 'Draw polygon',
			iconSvgContent: '<path d="M19.5 7v10M4.5 7v10M7 19.5h10M7 4.5h10"/><path d="M22 18v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zm0-15v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 18v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 3v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1z"/>',
			onClick: function (e) {
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
			onClick: function (e) {
				interactiveMap.toggleButtonState('geometryActions', 'hidden', true)
				drawPlugin.newLine(crypto.randomUUID(), {
					stroke: { outdoor: '#99704a', dark: '#ffffff' },
					strokeWidth: 6
				})
			}
		},{
			id: 'editFeature',
			label: 'Edit feature',
			iconSvgContent: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
			isDisabled: true,
			onClick: function (e) {
				const editSuccess = drawPlugin.editFeature(selectedFeatureIds[0])
				if (!editSuccess) {
					return
				}
				interactiveMap.toggleButtonState('geometryActions', 'hidden', true)
			}
		},{
			id: 'deleteFeature',
			label: 'Delete feature',
			iconSvgContent: '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
			isDisabled: true,
			onClick: function (e) {
				interactiveMap.toggleButtonState('geometryActions', 'hidden', false)
				drawPlugin.deleteFeature(selectedFeatureIds)
				interactiveMap.toggleButtonState('drawPolygon', 'disabled', false)
				interactiveMap.toggleButtonState('drawLine', 'disabled', false)
				interactiveMap.toggleButtonState('editFeature', 'disabled', true)
				interactiveMap.toggleButtonState('deleteFeature', 'disabled', true)
			}
		}]
	})
})

interactiveMap.on('datasets:ready', function () {
	// datasets ready
})

let selectedFeatureIds = []

interactiveMap.on('draw:ready', function () {
	drawPlugin.addFeature({
		id: 'test1234',
		type: 'Feature',
		geometry: {'type':'Polygon','coordinates':[[[337612,504612],[337592,504595],[337575,504583],[337570,504582],[337560,504582],[337554,504590],[337559,504596],[337568,504604],[337572,504610],[337582,504611],[337585,504610],[337602,504612],[337603,504607],[337605,504605],[337609,504605],[337612,504612]],[[337598,504609],[337587,504605],[337577,504605],[337572,504607],[337573,504610],[337575,504613],[337580,504613],[337586,504612],[337593,504613],[337597,504611],[337598,504609]]]},
		stroke: 'rgba(0,112,60,1)',
		fill: 'rgba(0,112,60,0.2)',
		strokeWidth: 2
	})
	drawPlugin.editFeature('test1234')
})

interactiveMap.on('draw:started', function (e) {
	interactiveMap.toggleButtonState('geometryActions', 'hidden', true)
})

interactiveMap.on('draw:editstart', function (e) {
	interactiveMap.toggleButtonState('geometryActions', 'hidden', true)
})

interactiveMap.on('draw:created', function (e) {
	console.log('draw:created', e)
	interactiveMap.toggleButtonState('geometryActions', 'hidden', false)
})

interactiveMap.on('draw:updated', function (e) {
	console.log('draw:updated', e)
})

interactiveMap.on('draw:edited', function (e) {
	console.log('draw:edited', e)
	interactiveMap.toggleButtonState('geometryActions', 'hidden', false)
})

interactiveMap.on('draw:cancelled', function (e) {
	console.log('draw:cancelled', e)
	interactiveMap.toggleButtonState('geometryActions', 'hidden', false)
})