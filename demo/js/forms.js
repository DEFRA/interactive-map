import InteractiveMap from '../../src/index.js'
import { vtsMapStyles3857 } from './mapStyles.js'
import { searchCustomDatasets } from './searchCustomDatasets.js'
import { transformGeocodeRequest, transformTileRequest } from './auth.js'
// Providers
import maplibreProvider from '/providers/maplibre/src/index.js'
import openNamesProvider from '/providers/beta/open-names/src/index.js'
// Plugins
import useLocationPlugin from '/plugins/beta/use-location/src/index.js'
import mapStylesPlugin from '/plugins/beta/map-styles/src/index.js'
import scaleBarPlugin from '/plugins/beta/scale-bar/src/index.js'
import searchPlugin from '/plugins/search/src/index.js'
import createInteractPlugin from '/plugins/interact/src/index.js'

var interactPlugin = createInteractPlugin({
	// dataLayers: [],
	markerColor: { outdoor: '#ff0000' },
	// closeOnDone: false,
	// closeOnCancel: false,
	interactionMode: 'marker', // 'auto', 'select', 'marker' // defaults to 'marker'
	multiSelect: false
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
	enableZoomControls: true,
	// center: [-2.938769, 54.893806],
	bounds: [-2.989707, 54.864555, -2.878635, 54.937635],
	containerHeight: '650px',
	transformRequest: transformTileRequest,
	// enableFullscreen: true,
	// hasExitButton: true,
	// markers: [{
	// 	id: 'location',
	// 	coords: [-2.9592267, 54.9045977],
	// 	color: { outdoor: '#ff0000', dark: '#00ff00' }
	// }],
	// mapStyle: {
	// 	url: process.env.OUTDOOR_URL,
	// 	logo: '/assets/images/os-logo.svg',
	// 	logoAltText: 'Ordnance survey logo',
	// 	attribution: `Contains OS data ${String.fromCharCode(169)} Crown copyright and database rights ${(new Date()).getFullYear()}`,
	// 	backgroundColor: '#f5f5f0'
	// },
	plugins: [
		mapStylesPlugin({
			mapStyles: vtsMapStyles3857
		}),
		scaleBarPlugin({
			units: 'metric'
		}),
		searchPlugin({
			transformRequest: transformGeocodeRequest,
			osNamesURL: process.env.OS_NAMES_URL,
			customDatasets: searchCustomDatasets,
			width: '300px',
			showMarker: false,
			// isExpanded: true
		}),
		useLocationPlugin(),
		interactPlugin
	]
	// search
})

var defraMap2 = new InteractiveMap('map2', {
	behaviour: 'inline',
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
	// enableFullscreen: true,
	// hasExitButton: true,
	// markers: [{
	// 	id: 'location',
	// 	coords: [-2.9592267, 54.9045977],
	// 	color: { outdoor: '#ff0000', dark: '#00ff00' }
	// }],
	// mapStyle: {
	// 	url: process.env.OUTDOOR_URL,
	// 	logo: '/assets/images/os-logo.svg',
	// 	logoAltText: 'Ordnance survey logo',
	// 	attribution: `Contains OS data ${String.fromCharCode(169)} Crown copyright and database rights ${(new Date()).getFullYear()}`,
	// 	backgroundColor: '#f5f5f0'
	// },
	plugins: [
		mapStylesPlugin({
			mapStyles: vtsMapStyles3857
		}),
		scaleBarPlugin({
			units: 'metric'
		}),
		// searchPlugin({
		// 	transformRequest: transformGeocodeRequest,
		// 	osNamesURL: process.env.OS_NAMES_URL,
		// 	customDatasets: searchCustomDatasets,
		// 	width: '300px',
		// 	showMarker: false,
		// 	// isExpanded: true
		// }),
		// useLocationPlugin(),
		interactPlugin
	]
	// search
})

interactiveMap.on('map:ready', function (e) {
	interactiveMap.addPanel('tooltip', {
		label: 'How to use the map',
		html: `
			<p>Help text...</p>
		`,
		mobile: {
			slot: 'bottom',
		},
		tablet: {
			slot: 'bottom'
		},
		desktop: {
			slot: 'bottom'
		}
	})
})

interactiveMap.on('draw:ready', function () {
	// drawPlugin.newPolygon('test')
	// drawPlugin.editFeature(featureGeoJSON)
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

interactiveMap.on('app:panelopened', function (e) {
	console.log('app:panelopened', e)
})

interactiveMap.on('app:panelclosed', function (e) {
	console.log('app:panelclosed', e)
})