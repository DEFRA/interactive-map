// CSS
// import '../../dist/css/index.css'
// import '/plugins/beta/map-styles/dist/css/index.css'
// import '/plugins/beta/scale-bar/dist/css/index.css'
// import '/plugins/search/dist/css/index.css'
// import '/plugins/interact/dist/css/index.css'
// import '/plugins/beta/frame/dist/css/index.css'
// InteractiveMap
import InteractiveMap from '../../src/index.js'
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
import { vtsMapStyles27700 } from './mapStyles.js'
import { gridRefSearchOSGB36 } from './searchCustomDatasets.js'
import { transformGeocodeRequest, transformTileRequest, setupEsriConfig } from './auth.js'
import { renderMenuHTML, hideMenu, addMenuClickHandlers, toggleButtonState } from './planning/menu.js'
import { renderKeyHTML, toggleKeyItemVisibility, updateKeyColours } from './planning/key.js'
import { getGeometryShape, getQueryParam } from './planning/utils.js'
import { addVectorTileLayers, addFeatureLayers, setDataset, setMapFeatures, setColors } from './planning/layers.js'

let feature
// const feature = { id: 'boundary', type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[371013.629737365,518087.27160546643],[371026.76930227707,518103.6431258204],[371076.00861123804,518150.38583537703],[371082.5004262571,518144.458668744],[371088.1419858577,518146.24617482634],[371119.04499505187,518121.1373772673],[371061.7528809118,518034.9300132221],[371044.3521903893,518057.18438187643],[371013.629737365,518087.27160546643]]]}, properties: { id: 'boundary' }}

const interactPlugin = createInteractPlugin({
	marker: {
		symbol: 'pin',
		backgroundColor: { outdoor: '#0b0c0c', dark: '#ffffff' },
		foregroundColor: { outdoor: '#ffff', dark: '#0b0c0c' }
	},
	// interactionModes: ['selectMarker'], // e.g. ['selectMarker'], ['selectFeature'], ['placeMarker'], or combinations
	// multiSelect: true
})

const drawPlugin = createDrawPlugin({
	onGeometryChange: (geometry) => true
})

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
		transformRequest: transformGeocodeRequest
	}),
	// maxMobileWidth: 700,
	// minDesktopWidth: 960,
	mapLabel: 'Ambleside',
	// zoom: 14,
	minZoom: 6,
	maxZoom: 20,
	autoColorScheme: true,
	// center: [337672, 504580],
	extent: [337047, 503795, 338120, 505281],
	containerHeight: '650px',
	transformRequest: transformTileRequest,
	enableFullscreen: false,
	hasExitButton: true,
	plugins: [
		mapStylesPlugin({
			mapStyles: vtsMapStyles27700,
			manifest: {
				buttons: [{ id: 'mapStyles', desktop: { slot: 'right-top', showLabel: false }}],
				panels: [{ id: 'mapStyles', desktop: { slot: 'map-styles-button', width: '400px', modal: true }}]
			}
		}),
		scaleBarPlugin({
			units: 'metric'
		}),
		searchPlugin({
			transformRequest: transformGeocodeRequest,
			placeholder: 'Search for a place in England',
			manifest: {
				controls: [{id: 'search', desktop: {slot: 'top-left', showLabel: true}}]
			},
			osNamesURL: process.env.OS_NAMES_URL,
			regions: ['england'],
			customDatasets: [gridRefSearchOSGB36],
			width: '300px',
			showMarker: true,
			// expanded: true
		}),
		useLocationPlugin(),
		interactPlugin,
		drawPlugin,
		framePlugin
	]
	// search
})

interactiveMap.on('app:ready', function (e) {
	interactiveMap.addButton('help', {
		label: 'Help',
		href: 'https://google.co.uk',
		iconSvgContent: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
		mobile: { slot: 'right-top', showLabel: false },
		tablet: { slot: 'right-top', showLabel: false, order: 1 },
		desktop: { slot: 'right-top', showLabel: false, order: 1 }
	})
	interactiveMap.addButton('menu', {
		label: 'Menu',
		panelId: 'menu',
		iconSvgContent: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
		mobile: { slot: 'top-left', order: 1, showLabel: false },
		tablet: { slot: 'top-left', order: 2 },
		desktop: { slot: 'top-left', order: 2 }
	})
	interactiveMap.addButton('key', {
		label: 'Key',
		panelId: 'key',
		iconSvgContent: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>',
		mobile: { slot: 'top-left', order: 2, showLabel: false },
		tablet: { slot: 'top-left', order: 3 },
		desktop: { slot: 'top-left', order: 3 }
	})
	interactiveMap.addPanel('menu', {
		label: 'Menu',
		html: renderMenuHTML(feature),
		mobile: { slot: 'side', modal: true, open: false },
		tablet: { slot: 'side', width: '260px', open: true },
		desktop: { slot: 'side', width: '280px', open: true }
	})
	interactiveMap.addPanel('key', {
		label: 'Key',
		html: renderKeyHTML(),
		mobile: { slot: 'drawer', open: false, exclusive: true },
		tablet: { slot: 'left-top', width: '260px', open: false, exclusive: true },
		desktop: { slot: 'left-top', width: '280px', open: false, exclusive: true }
	})
})

interactiveMap.on('map:ready', function (e) {
	const mapProvider = e
	// Add datasets and map features
	const dataset = getQueryParam('dataset', 'floodzones-presentday')
	const mapFeatures = getQueryParam('features')
	addVectorTileLayers(mapProvider, dataset)
	addFeatureLayers(mapProvider, mapFeatures)
	toggleKeyItemVisibility({ dataset })
	toggleKeyItemVisibility({ mapFeatures })
	updateKeyColours(e.mapStyleId)
	interactPlugin.enable()

	// Menu radio and checkbox events
	document.addEventListener('fmp:datasetchanged', (e) => {
		setDataset(e.detail.dataset)
		toggleKeyItemVisibility(e.detail)
	})

	document.addEventListener('fmp:featureschanged', (e) => {
		setMapFeatures(e.detail.mapFeatures)
		toggleKeyItemVisibility(e.detail)
	})
})

interactiveMap.on('map:stylechange', function (e) {
	setColors(e.mapStyleId)
	updateKeyColours(e.mapStyleId)
})

interactiveMap.on('app:panelopened', (e) => {
	// console.log('app:panelopened', e)
})

interactiveMap.on('map:exit', function (e) {
	drawOptions = ['shape', 'square']
})

interactiveMap.on('interact:markerchange', function (e) {
	interactiveMap.addPanel('info', {
		label: 'Info',
		html: '<p>Some info</p>',
		visibleGeometry: {type: 'Feature', geometry: {type: 'Point', coordinates: e.coords}}
	})
})

interactiveMap.on('draw:ready', function () {
	// Add a feature if provided
	if (feature) {
		drawPlugin.addFeature(feature)
	}

	// Add menu click handlers
	addMenuClickHandlers({
		onDrawShape: function() {
			drawPlugin.newPolygon('boundary', {
				onGeometryChange: (geometry) => true
			})
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
				drawPlugin.editFeature('boundary', {
					onGeometryChange: (geometry) => true
				})
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

interactiveMap.on('draw:updated', function (e) {
	console.log('draw:updated', e)
})

interactiveMap.on('draw:created', function (e) {
	console.log('draw:created', e)
})

interactiveMap.on('draw:cancelled', function (e) {
	console.log('draw:cancelled', e)
	toggleButtonState(feature ? ['edit', 'delete'] : ['shape', 'square'])
})

interactiveMap.on('draw:deleted', function (e) {
	// console.log('draw:deleted', e)
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