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
import { transformGeocodeRequest, transformVtsRequest3857, setupEsriConfig } from './auth.js'
import { renderMenuHTML, hideMenu, addMenuClickHandlers, toggleButtonState } from './planning/menu.js'
import { renderKeyHTML, toggleKeyItemVisibility, updateKeyColours } from './planning/key.js'
import { getGeometryShape, getQueryParam } from './planning/utils.js'
import { addVectorTileLayers, addFeatureLayers, setDataset, setMapFeatures, setColors } from './planning/layers.js'

let feature
// Some examples of polygons - can be used for testing simplification, self-intersection and hole handling. 
// The repeated point polygon is a non-simple feature that should be simplified to a valid polygon, 
// the bow-tie polygon is a self-intersecting polygon that can be simplified to a valid polygon, 
// but still contains multiple shapes that are not yet  supported and should be rejected.
// the square contains a hole (the smaller square) which is not supported and should be rejected.
const repeatedPointPolygon = [[[294776.26105,84443.86829],[294414.67425,84244.69738],[294414.67425,84244.69738],[293618.44985,83960.51247],[291704.91433,84262.56294],[290550.71282,84868.41697],[289664.4461,85675.22397],[288536.79025,86618.54328],[288400.39733,88159.71153],[288715.15255,88809.43255],[288164.58436,90321.29741],[287877.61377,90964.86384],[287875.45992,92614.33407],[288027.44177,93566.74813],[288225.26695,94030.91045],[288844.10898,94860.7026],[290115.02218,95451.89228],[290905.80852,95547.66262],[291373.54542,95462.97806],[292760.76096,95340.61139],[293688.25234,95696.19939],[294613.34168,95939.61197],[295499.30008,96109.05311],[296162.20635,96395.41811],[297400.19877,96333.44535],[298388.01025,95958.29754],[299457.18303,95900.10823],[300783.45777,95537.604],[301794.37439,94375.95283],[301919.46214,94036.41671],[301833.07241,93438.55414],[300695.99155,92916.73026],[299694.11958,92598.61727],[299137.12749,91972.21018],[299191.64292,90902.8417],[299255.94577,90339.24938],[299328.21833,89212.95611],[299066.14517,88299.15325],[298942.1195,87720.14546],[299164.81448,86590.35431],[299493.18917,86058.72191],[298345.16512,85067.65648],[297617.56462,84425.00966],[296499.88609,84052.86277],[294776.26105,84443.86829]]]
const bowTiePolygon =[[[300615, 89868], [300893, 90348], [300283, 89988], [300030, 90393], [300615, 89868]]]
// Note all of the following lack an extra array wrapper, so should be passed as [square], [smallerSquare], [ringPolygon] etc. to be valid GeoJSON
const square =[[300615, 89868], [300815, 89868], [300815, 90068], [300615, 90068],  [300615, 89868]]
const smallerSquare =[[300655, 89918], [300705, 89918], [300705, 89968], [300655, 89968],  [300655, 89918]]
const offsetSmallerSquare =[[300855, 109918], [300805, 109918], [300805, 109968], [300855, 109968],  [300855, 109918]]
const ringPolygon = [square, smallerSquare]

feature = { // Non-Simple feature for testing simplification
  id: 'boundary',
  type: 'Feature',
  geometry: {
    type: 'MultiPolygon',
    coordinates: repeatedPointPolygon
  },
  properties: {
    id: 'boundary'
  }
}

const interactPlugin = createInteractPlugin({
	marker: {
		symbol: 'pin',
		backgroundColor: { outdoor: '#0b0c0c', dark: '#ffffff' },
		foregroundColor: { outdoor: '#ffff', dark: '#0b0c0c' }
	},
	interactionModes: ['placeMarker'], // e.g. ['selectMarker'], ['selectFeature'], ['placeMarker'], or combinations
	// multiSelect: true
})

const drawPlugin = createDrawPlugin({
	onGeometryChange: (geometry) => true
})

const framePlugin = createFramePlugin({
	aspectRatio: 1.5
})

const interactiveMap = new InteractiveMap('map', {
	behaviour: 'mapOnly',
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
	transformRequest: transformVtsRequest3857,
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
    const result = drawPlugin.addFeature(feature)
    if (!result.success) {
      feature = null
      interactiveMap.addPanel('error',{
        label: 'Invalid site boundary supplied',
        mobile: { slot: 'middle', modal: true},
        tablet: { slot: 'middle', width: '400px', modal: true },
        desktop: { slot: 'middle', width: '400px', modal: true },
        html: 'Failed to add the supplied site boundary - it may be invalid, self-intersecting or contain unsupported geometry such as holes or multiple polygons'
      })
    }
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