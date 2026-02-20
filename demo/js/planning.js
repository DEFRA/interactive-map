import InteractiveMap from '../../src/index.js'
import { vtsMapStyles27700 } from './mapStyles.js'
import { searchCustomDatasets } from './searchCustomDatasets.js'
import { transformGeocodeRequest, transformTileRequest, setupEsriConfig } from './auth.js'
// Providers
import openNamesProvider from '/providers/beta/open-names/src/index.js'
import esriProvider from '/providers/beta/esri/src/index.js'
// Plugins
import useLocationPlugin from '/plugins/beta/use-location/src/index.js'
import mapStylesPlugin from '/plugins/beta/map-styles/src/index.js'
import createDrawPlugin from '/plugins/beta/draw-es/src/index.js'
import scaleBarPlugin from '/plugins/beta/scale-bar/src/index.js'
import searchPlugin from '/plugins/search/src/index.js'
import createInteractPlugin from '/plugins/interact/src/index.js'
import createFramePlugin from '/plugins/beta/frame/src/index.js'
// Demo utils
import { renderMenuHTML, hideMenu, addMenuClickHandlers, toggleButtonState } from './planning-menu.js'
import { renderKeyHTML, toggleKeyItemVisibility } from './planning-key.js'
import { getGeometryShape, getQueryParam } from './planning-utils.js'
import { addOrRemoveDatasets, addOrRemoveMapFeatures } from './planning-layers.js'

let feature
// const feature = { id: 'boundary', type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[371013.629737365,518087.27160546643],[371026.76930227707,518103.6431258204],[371076.00861123804,518150.38583537703],[371082.5004262571,518144.458668744],[371088.1419858577,518146.24617482634],[371119.04499505187,518121.1373772673],[371061.7528809118,518034.9300132221],[371044.3521903893,518057.18438187643],[371013.629737365,518087.27160546643]]]}, properties: { id: 'boundary' }}

const interactPlugin = createInteractPlugin({
	dataLayers: [{
		layerId: 'field-parcels',
		idProperty: 'ID',
		selectedFeatureStyle: { stroke: { outdoor: '#ff0000', dark: '#00ff00' }, strokeWidth: 2, fill: 'rgba(255, 0, 0, 0.1)' }
	},{
		layerId: 'linked-parcels',
		idProperty: 'ID',
		selectedFeatureStyle: { stroke: { outdoor: '#ff0000', dark: '#00ff00' }, strokeWidth: 2, fill: 'rgba(255, 0, 0, 0.1)' }
	}],
	markerColor: { outdoor: '#ff0000' },
	interactionMode: 'marker', // 'auto', 'select', 'marker' // defaults to 'marker'
	// multiSelect: true
})

const drawPlugin = createDrawPlugin()

const framePlugin = createFramePlugin({
	aspectRatio: 1.5
})

const interactiveMap = new InteractiveMap('map', {
	behaviour: 'inline',
	mapProvider: esriProvider({
		setupConfig: setupEsriConfig
	}),
	reverseGeocodeProvider: openNamesProvider({
		url: process.env.OS_NEAREST_URL,
		// url: '/api/os-nearest-proxy?query={query}',
		transformRequest: transformGeocodeRequest
		// showMarker: true
	}),
	// maxMobileWidth: 700,
	// minDesktopWidth: 960,
	mapLabel: 'Ambleside',
	// zoom: 14,
	minZoom: 2,
	maxZoom: 15,
	autoColorScheme: true,
	// center: [337672, 504580],
	extent: [337047, 503795, 338120, 505281],
	containerHeight: '650px',
	transformRequest: transformTileRequest,
	enableFullscreen: false,
	enableZoomControls: true,
	hasExitButton: true,
	// markers: [{
	// 	id: 'location',
	// 	coords: [-2.9592267, 54.9045977],
	// 	color: { outdoor: '#ff0000', dark: '#00ff00' }
	// }],
	// mapStyle: {
	// 	url: process.env.VTS_OUTDOOR_URL_27700,
	// 	logo: '/assets/images/os-logo.svg',
	// 	logoAltText: 'Ordnance survey logo',
	// 	attribution: `Contains OS data ${String.fromCharCode(169)} Crown copyright and database rights ${(new Date()).getFullYear()}`,
	// 	backgroundColor: '#f5f5f0'
	// },
	plugins: [
		mapStylesPlugin({
			mapStyles: vtsMapStyles27700
		}),
		scaleBarPlugin({
			units: 'metric'
		}),
		searchPlugin({
			transformRequest: transformGeocodeRequest,
			osNamesURL: process.env.OS_NAMES_URL,
			customDatasets: searchCustomDatasets,
			width: '300px',
			showMarker: true
		}),
		useLocationPlugin(),
		// interactPlugin,
		drawPlugin,
		framePlugin
	]
	// search
})

interactiveMap.on('app:ready', function (e) {
	interactiveMap.addButton('menu', {
		label: 'Menu',
		panelId: 'menu',
		iconSvgContent: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
		mobile: { slot: 'top-left', order: 1 },
		tablet: { slot: 'top-left', order: 2, showLabel: true },
		desktop: { slot: 'top-left', order: 2, showLabel: true }
	})
	interactiveMap.addButton('key', {
		label: 'Key',
		panelId: 'key',
		iconSvgContent: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>',
		mobile: { slot: 'top-left', order: 2 },
		tablet: { slot: 'top-left', order: 3, showLabel: true },
		desktop: { slot: 'top-left', order: 3, showLabel: true }
	})
	interactiveMap.addPanel('menu', {
		label: 'Menu',
		html: renderMenuHTML(feature),
		mobile: { slot: 'side', modal: true, initiallyOpen: true },
		tablet: { slot: 'side', width: '260px', initiallyOpen: true },
		desktop: { slot: 'side', width: '280px', initiallyOpen: true }
	})
	interactiveMap.addPanel('key', {
		label: 'Key',
		html: renderKeyHTML(),
		mobile: { slot: 'bottom', initiallyOpen: false, exclusive: true },
		tablet: { slot: 'inset', width: '260px', initiallyOpen: false, exclusive: true },
		desktop: { slot: 'inset', width: '280px', initiallyOpen: false, exclusive: true }
	})
})

interactiveMap.on('map:ready', function (e) {
	console.log(e)
	
	// Add datasets and map features
	const dataset = getQueryParam('dataset', 'floodzones-presentday')
	const mapFeatures = getQueryParam('features')
	addOrRemoveDatasets(e, dataset)
	addOrRemoveMapFeatures(e, mapFeatures)
	toggleKeyItemVisibility({ dataset })
	toggleKeyItemVisibility({ mapFeatures })

	// Menu radio and checkbox events
	document.addEventListener('fmp:datasetchanged', (e) => {
		addOrRemoveDatasets(e.detail)
		toggleKeyItemVisibility(e.detail)
	})

	document.addEventListener('fmp:featureschanged', (e) => {
		addOrRemoveMapFeatures(e.detail)
		toggleKeyItemVisibility(e.detail)
	})
})

interactiveMap.on('map:exit', function (e) {
	drawOptions = ['shape', 'square']
})

interactiveMap.on('draw:ready', function () {
	// Add a feature if provided
	if (feature) {
		drawPlugin.addFeature(feature)
	}

	// Add menu click handlers
	addMenuClickHandlers({
		onDrawShape: function() {
			drawPlugin.newPolygon('boundary')
			hideMenu(interactiveMap)
		},
		onDrawFrame: function() {
			framePlugin.addFrame('boundary', {
				aspectRatio: 1
			})
			hideMenu(interactiveMap)
		},
		onEdit: function() {
			if (getGeometryShape(feature.geometry) === 'square') {
				drawPlugin.deleteFeature('boundary')
				framePlugin.editFeature(feature)
			} else {
				drawPlugin.editFeature('boundary')
			}
			hideMenu(interactiveMap)
		},
		onDelete: function() {
			drawPlugin.deleteFeature('boundary')
			feature = null
			hideMenu(interactiveMap)
		}
	})
})

interactiveMap.on('draw:done', function (e) {
	console.log('draw:done', e)
	feature = e.newFeature
	toggleButtonState(['edit', 'delete'])
})

interactiveMap.on('draw:update', function (e) {
	console.log('draw:update', e)
})

interactiveMap.on('draw:create', function (e) {
	console.log('draw:create', e)
})

interactiveMap.on('draw:cancel', function (e) {
	console.log('draw:cancel', e)
	toggleButtonState(feature ? ['edit', 'delete'] : ['shape', 'square'])
})

interactiveMap.on('draw:delete', function (e) {
	// console.log('draw:delete', e)
})

interactiveMap.on('frame:done', function (e) {
	drawPlugin.addFeature(e)
	feature = e
	toggleButtonState(['edit', 'delete'])
})

interactiveMap.on('frame:cancel', function () {
	if (feature) {
		drawPlugin.addFeature(feature)
	}
	toggleButtonState(feature ? ['edit', 'delete'] : ['shape', 'square'])
})