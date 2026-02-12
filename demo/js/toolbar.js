import InteractiveMap from '../../src/index.js'
import { openMapStyles, vtsMapStyles3857 } from './mapStyles.js'
import { searchCustomDatasets } from './searchCustomDatasets.js'
import { transformGeocodeRequest, transformTileRequest } from './auth.js'
// Providers
import maplibreProvider from "/providers/maplibre/src/index.js"
import openNamesProvider from "/providers/beta/open-names/src/index.js"
// Plugins
import useLocationPlugin from "/plugins/beta/use-location/src/index.js"
import mapStylesPlugin from "/plugins/beta/map-styles/src/index.js"
import createDrawPlugin from "/plugins/beta/draw-ml/src/index.js"
import scaleBarPlugin from "/plugins/beta/scale-bar/src/index.js"
import searchPlugin from "/plugins/search/src/index.js"
import createInteractPlugin from "/plugins/interact/src/index.js"
import { bbox } from '@turf/bbox'

const geojson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { description: 'My farm house' },
      geometry: {
        coordinates: [-2.5723699109417737, 53.2380485215034],
        type: 'Point'
      },
      id: 'a'
    },
    {
      type: 'Feature',
      properties: { description: 'Main gas line' },
      geometry: {
        coordinates: [
          [-2.570496516462896, 53.239162468888566],
          [-2.5722447488110447, 53.238174174285746]
        ],
        type: 'LineString'
      },
      id: 'b'
    },
    {
      type: 'Feature',
      properties: { description: 'My Pony Paddock' },
      geometry: {
        coordinates: [
          [
            [-2.573552894955583, 53.238229751360706],
            [-2.5738557065633643, 53.23812342993719],
            [-2.5737507318720247, 53.23797119653088],
            [-2.573411582871387, 53.23785037598134],
            [-2.5727575097991178, 53.23787454011864],
            [-2.572858447002119, 53.23825391528342],
            [-2.573552894955583, 53.238229751360706]
          ]
        ],
        type: 'Polygon'
      },
      id: 'c'
    },
    {
      type: 'Feature',
      properties: { description: 'My farm house #2' },
      geometry: {
        coordinates: [-2.5724, 53.239],
        type: 'Point'
      },
      id: 'd'
    }
  ]
}

const bounds = bbox(geojson)

const interactPlugin = createInteractPlugin({
  interactionMode: 'marker', // 'auto', 'select', 'marker' // defaults to 'marker'
  multiSelect: true,
  contiguous: true
})

const drawPlugin = createDrawPlugin()

const interactiveMap = new InteractiveMap('map', {
  behaviour: 'hybrid',
  mapProvider: maplibreProvider(),
  reverseGeocodeProvider: openNamesProvider({
    url: process.env.OS_NEAREST_URL,
    transformRequest: transformGeocodeRequest
    // showMarker: true
  }),
  mapLabel: 'Map geojson editor',
  minZoom: 6,
  maxZoom: 20,
  autoColorScheme: true,
  bounds,
  containerHeight: '650px',
  transformRequest: transformTileRequest,
  enableZoomControls: true,
  mapStyle: {
    url: process.env.OUTDOOR_URL,
    logo: '/assets/images/os-logo.svg',
    logoAltText: 'Ordnance survey logo',
    attribution: `Contains OS data ${String.fromCharCode(169)} Crown copyright and database rights ${new Date().getFullYear()}`,
    backgroundColor: '#f5f5f0'
  },
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
      showMarker: false
    }),
    useLocationPlugin(),
    interactPlugin,
    drawPlugin
  ]
})

interactiveMap.on('draw:ready', function () {
  geojson.features.forEach((feature) => {
    switch (feature.geometry.type) {
      case 'Polygon':
        drawPlugin.addFeature({
          ...feature,
          properties: {
            stroke: 'rgba(0,112,60,1)',
            fill: 'rgba(0,112,60,0.2)',
            strokeWidth: 2
          }
        })
        break
      case 'LineString':
        drawPlugin.addFeature({
          ...feature,
          properties: {
            stroke: 'rgba(0, 11, 112, 1)',
            fill: 'rgba(0, 11, 112, 0.2)',
            strokeWidth: 2
          }
        })
        break
      case 'Point':
        interactiveMap.addMarker(feature.id, feature.geometry.coordinates)
        break

      default:
        break
    }
  })

  interactiveMap.addButton('btnAddPoint', {
    label: 'Add point',
    iconId: 'plus',
    onClick: (event, context) => interactPlugin.enable(),
    mobile: { slot: 'top-right' },
    tablet: { slot: 'top-right' },
    desktop: { slot: 'top-right' }
  })

  interactiveMap.addButton('btnAddPolygon', {
    label: 'Add polygon',
    iconId: 'polygon',
    onClick: (event, context) => {
      resetChangedFeature()
      drawPlugin.newPolygon(generateID())
    },
    mobile: { slot: 'top-right' },
    tablet: { slot: 'top-right' },
    desktop: { slot: 'top-right' }
  })

  interactiveMap.addButton('btnAddLine', {
    label: 'Add line',
    iconId: 'minus',
    onClick: (event, context) => {
      resetChangedFeature()
      drawPlugin.newLine(generateID())
    },
    mobile: { slot: 'top-right' },
    tablet: { slot: 'top-right' },
    desktop: { slot: 'top-right' }
  })
})

let _changedFeature = undefined

function resetChangedFeature() {
  _changedFeature = undefined
}


function removeFeature(id) {
  const idx = geojson.features.findIndex((f) => f.id === id)

  if (idx > -1) {
    geojson.features.splice(idx, 1)
    renderFeatureList(geojson)
  }
}

interactiveMap.on('draw:done', function (e) {
  console.log('draw:done', e)

  const changedFeature = e.newFeature
  const featureId = changedFeature.id
  const feature = geojson.features.find((f) => f.id === featureId)

  // Ensure the featureId exists in the geojson
  if (feature && _changedFeature?.id === featureId) {
    feature.geometry = _changedFeature.geometry

    // Update the list
    renderFeatureList(geojson)
  } else {
    // New feature
    const typeName =
      changedFeature.geometry.type === 'LineString' ? 'line' : 'polygon'
    const description =
      prompt(`What would you like to call this new ${typeName}?`) ??
      `New ${typeName}`

    geojson.features.push({
      ...changedFeature,
      properties: {
        description
      }
    })

    // Update the list
    renderFeatureList(geojson)
  }

  resetChangedFeature()
})

interactiveMap.on('draw:create', function (e) {
  console.log('draw:create', e)

  // const newFeature = e.features.at(0)
  // const typeName =
  //   newFeature.geometry.type === 'LineString' ? 'line' : 'polygon'
  // const description =
  //   prompt(`What would you like to call this new ${typeName}?`) ??
  //   `New ${typeName}`

  // geojson.features.push({
  //   ...newFeature,
  //   properties: {
  //     description
  //   }
  // })

  // // Update the list
  // renderFeatureList(geojson)
})

interactiveMap.on('draw:update', function (e) {
  console.log('draw:update', e)
  if (e.action === 'change_coordinates') {
    if (e.features.length === 1) {
      const changedFeature = e.features.at(0)
      const featureId = changedFeature.id
      const feature = geojson.features.find((f) => f.id === featureId)

      // Ensure the featureId exists in the geojson
      if (feature) {
        _changedFeature = changedFeature
      }
    }
  }
})

interactiveMap.on('interact:markerchange', function (e) {
  console.log('interact:markerchange', e)

  const id = generateID()
  const description = prompt('What would you like to call this new point?') ?? 'New point'

  geojson.features.push({
    type: 'Feature',
    properties: {
      description
    },
    geometry: {
      type: 'Point',
      coordinates: e.coords
    },
    id
  })

  // Update the list
  renderFeatureList(geojson)

  interactiveMap.addMarker(id, e.coords)

  interactiveMap.removeMarker('location')
  interactPlugin.disable()
})

const listEl = document.getElementById('list')

if (listEl === null) {
  throw new Error('Missing list container element')
}

// List render from precompiled template
const renderFeatureList = (geojson) => {
  const html = window.nunjucks.render('assets/templates/editor.njk', {
    geojson
  })
  listEl.innerHTML = html
}

renderFeatureList(geojson)

// Handle edit/delete clicks in the table
listEl.addEventListener(
  'click',
  function (e) {
    const target = e.target
    if (target.tagName === 'A' && target.dataset.action && target.dataset.id) {
      e.preventDefault()
      e.stopPropagation()

      const { action, id, type } = target.dataset
      if (action === 'edit') {
        if (type === 'Point') {
          interactPlugin.selectFeature({ featureId: id })
        } else {
          drawPlugin.editFeature(id)
        }
      } else if (action === 'delete') {
        if (type === 'Point') {
          interactiveMap.removeMarker(id)
          removeFeature(id)
        } else {
          drawPlugin.deleteFeature(id)
          removeFeature(id)
        }
      }
    } else if (target.tagName === 'DIV' && target.matches('.description')) {
      listEl
        .querySelectorAll('.description')
        .forEach((el) => el.removeAttribute('hidden'))

      listEl
        .querySelectorAll('.description-editor')
        .forEach((el) => el.setAttribute('hidden', 'hidden'))

      target.setAttribute('hidden', 'hidden')
      target.nextElementSibling.removeAttribute('hidden')
    }
  },
  false
)

function generateID () {
  const array = new Uint32Array(1)
  window.crypto.getRandomValues(array)
  return array.toString()
}
