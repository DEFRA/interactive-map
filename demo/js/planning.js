import InteractiveMap from '../../src/index.js'
import { vtsMapStyles27700 } from './mapStyles.js'
import { searchCustomDatasets } from './searchCustomDatasets.js'
import { transformGeocodeRequest, transformTileRequest, setupEsriConfig } from './auth.js'
// Providers
import openNamesProvider from '/providers/open-names/src/index.js'
import esriProvider from '/providers/esri/src/index.js'
// Plugins
import useLocationPlugin from '/plugins/use-location/src/index.js'
import mapStylesPlugin from '/plugins/map-styles/src/index.js'
import createDrawPlugin from '/plugins/draw-es/src/index.js'
import scaleBarPlugin from '/plugins/scale-bar/src/index.js'
import searchPlugin from '/plugins/search/src/index.js'
import createInteractPlugin from '/plugins/interact/src/index.js'
import createFramePlugin from '/plugins/frame/src/index.js'
// Demo utils
import { hideMenu, toggleButtonState, getGeometryShape } from './planning-utils.js'

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

const menuHTML = `
	<div class="fmp-menu">
		<h3 class="govuk-heading-s" id="boundary-heading">Get a boundary report</h3>
		<ul id="fmp-menu-list" class="fmp-menu-list" aria-labelledby="boundary-heading" role="menu">
			<li class="fmp-menu-item" role="presentation">
				<button id="shapeBtn" class="govuk-body-s fmp-menu-button" aria-disabled="${!!feature}">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M19.5 7v10M4.5 7v10M7 19.5h10M7 4.5h10"/><path d="M22 18v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zm0-15v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 18v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 3v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1z"/></svg>
					<span class="fmp-menu-button__label">Draw shape</span>
				</button>
			</li>
			<li class="fmp-menu-item" role="presentation">
				<button id="squareBtn" class="govuk-body-s fmp-menu-button" aria-disabled="${!!feature}">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
					<span class="fmp-menu-button__label">Draw square</span>
				</button>
			</li>
			<li class="fmp-menu-item" role="presentation">
				<button id="editBtn" class="govuk-body-s fmp-menu-button" aria-disabled="${!feature}">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
					<span class="fmp-menu-button__label">Edit area</span>
				</button>
			</li>
			<li class="fmp-menu-item" role="presentation">
				<button id="deleteBtn" class="govuk-body-s fmp-menu-button" aria-disabled="${!feature}">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
					<span class="fmp-menu-button__label">Delete area</span>
				</button>
			</li>
		</ul>
	</div>
`

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

interactiveMap.on('map:ready', function (e) {
	interactiveMap.addButton('menu', {
		label: 'Menu',
		panelId: 'menu',
		iconSvgContent: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
		mobile: { slot: 'top-left' },
		tablet: { slot: 'top-left', showLabel: true },
		desktop: { slot: 'top-left', showLabel: true }
	})
	interactiveMap.addButton('key', {
		label: 'Key',
		panelId: 'key',
		iconSvgContent: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>',
		mobile: { slot: 'top-left' },
		tablet: { slot: 'top-left', showLabel: true },
		desktop: { slot: 'top-left', showLabel: true }
	})
	interactiveMap.addPanel('menu', {
		label: 'Menu',
		html: menuHTML,
		mobile: { slot: 'side', modal: true, initiallyOpen: true },
		tablet: { slot: 'side', width: '260px', initiallyOpen: true },
		desktop: { slot: 'side', width: '280px', initiallyOpen: true }
	})
	interactiveMap.addPanel('key', {
		label: 'Key',
		html: '<p>Key</p>',
		mobile: { slot: 'bottom', initiallyOpen: false, exclusive: true },
		tablet: { slot: 'inset', width: '260px', initiallyOpen: false, exclusive: true },
		desktop: { slot: 'inset', width: '280px', initiallyOpen: false, exclusive: true }
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

	// Menu button click events
	document.addEventListener('click', e => {
		// Draw area
		const shapeBtn = e.target.closest('#shapeBtn')
		if (shapeBtn && shapeBtn.getAttribute('aria-disabled') !== 'true') {
			toggleButtonState([])
			drawPlugin.newPolygon('boundary')
			hideMenu(interactiveMap)
		}
		// Draw frame
		const squareBtn = e.target.closest('#squareBtn')
		if (squareBtn && squareBtn.getAttribute('aria-disabled') !== 'true') {
			toggleButtonState([])
			framePlugin.addFrame('boundary', {
				aspectRatio: 1
			})
			hideMenu(interactiveMap)
		}
		// Edit area
		const editBtn = e.target.closest('#editBtn')
		if (editBtn && editBtn.getAttribute('aria-disabled') !== 'true') {
			toggleButtonState([])
			if (getGeometryShape(feature.geometry) === 'square') {
				drawPlugin.deleteFeature('boundary')
				framePlugin.editFeature(feature)
			} else {
				drawPlugin.editFeature('boundary')
			}
			hideMenu(interactiveMap)
		}
		// Delete area
		const deleteBtn = e.target.closest('#deleteBtn')
		if (deleteBtn && deleteBtn.getAttribute('aria-disabled') !== 'true') {
			drawPlugin.deleteFeature('boundary')
			feature = null
			toggleButtonState(['shape', 'square'])
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
	// console.log('draw:update', e)
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