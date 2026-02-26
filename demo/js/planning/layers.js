import GroupLayer from '@arcgis/core/layers/GroupLayer.js'
import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer.js'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js'
import { COLOURS } from './colours.js'

// State
let map
let mapStyleId
let dataset
let mapFeatures

// =======================
// Datasets
// =======================

// StyleLayer config helpers
const depthFlatFills = COLOURS.extent
const depthRampFills = [
  { label: '>2300mm', color: COLOURS['>2300mm'], levels: ['all', '150', '300', '600', '900', '1200', '2300']},
  { label: '1200-2300mm', color: COLOURS['1200-2300mm'], levels: ['all', '150', '300', '600', '900', '1200']},
  { label: '900-1200mm', color: COLOURS['900-1200mm'], levels: ['all', '150', '300', '600', '900']},
  { label: '600-900mm', color: COLOURS['600-900mm'], levels: ['all', '150', '300', '600']},
  { label: '300-600mm', color: COLOURS['300-600mm'], levels: ['all', '150', '300']},
  { label: '150-300mm', color: COLOURS['150-300mm'], levels: ['all', '150']},
  { label: '<150mm', color: COLOURS['<150mm'], levels: ['all']}
]
const floodZone = (suffix, style) => ({[`Flood Zones 2 and 3 Rivers and Sea${suffix}`]: style})
const props = d => ({ 'fill-color': d.color, levels: d.levels })
const surfaceWaterBaseId = 'Surface Water Spatial Planning'
const entriesFromDepthFills = mapper => Object.fromEntries(depthRampFills.map(mapper))

const styleLayerConfig = {
  // Flood zones present day
  ...floodZone('/Flood Zone 3/1', {'fill-color': COLOURS.floodZone3}),
  ...floodZone('/Flood Zone 2/1', {'fill-color': COLOURS.floodZone2}),
  // Flood zones climate change
  ...floodZone(' CCP1/Flood Zones plus climate change/1', {'fill-color': COLOURS.floodZoneClimateChange}),
  ...floodZone(' CCP1/Unavailable/2', {'map-styles': ['dark']}),
  ...floodZone(' CCP1/Unavailable/1', {'map-styles': ['outdoor', 'black-and-white']}),
  ...floodZone(' CCP1/Unavailable/0', {'line-color': COLOURS.floodZoneClimateChangeNoData}),
  // Surface water present day
  ...entriesFromDepthFills(d => [`${surfaceWaterBaseId} 1 in 1000 Depths/${d.label}/1`, props(d)]),
  ...entriesFromDepthFills(d => [`${surfaceWaterBaseId} 1 in 100 Depths/${d.label}/1`, props(d)]),
  ...entriesFromDepthFills(d => [`${surfaceWaterBaseId} 1 in 30 Depths/${d.label}/1`, props(d)]),
  // Surface water climate change
  ...entriesFromDepthFills(d => [`${surfaceWaterBaseId} 1 in 1000 CCP1 Depths/${d.label}/1`, props(d)]),
  ...entriesFromDepthFills(d => [`${surfaceWaterBaseId} 1 in 100 CCP1 Depths/${d.label}/1`, props(d)]),
  ...entriesFromDepthFills(d => [`${surfaceWaterBaseId} 1 in 30 CCP1 Depths/${d.label}/1`, props(d)])
}

// VectorTileLayer config helpers
const vtLayer = ({ name, model, query, version = '_NON_PRODUCTION' }) => ({ name, version, model, query })
const floodZonesBaseName = 'Flood_Zones_2_and_3_Rivers_and_Sea'
const surfaceWaterBaseName = 'Surface_Water_Spatial_Planning'

const vectorTileLayersConfig = {
  floodzones: [
    vtLayer({
      name: `${floodZonesBaseName}_CCP1`,
      model: '_depth_Model_Origin_Layer_gdb',
      query: ['floodzones-climatechange']
    }),
    vtLayer({
      name: floodZonesBaseName,
      model: '_Model_Origin_Layer',
      query: ['floodzones-climatechange', 'floodzones-presentday']
    })
  ],
  surfacewater: [
    vtLayer({
      name: `${surfaceWaterBaseName}_1_in_1000_Depths`,
      model: '_depth_Model_Origin_Layer_gdb2',
      query: ['surfacewater-presentday-low']
    }),
    vtLayer({
      name: `${surfaceWaterBaseName}_1_in_100_Depths`,
      model: '_depth_Model_Origin_Layer_gdb',
      query: ['surfacewater-presentday-medium']
    }),
    vtLayer({
      name: `${surfaceWaterBaseName}_1_in_30_Depths`,
      model: '_Model_Origin_Layer',
      query: ['surfacewater-presentday-high']
    }),
    vtLayer({
      name: `${surfaceWaterBaseName}_1_in_1000_CCP1_Depths`,
      model: '_Model_Origin_Layer',
      query: ['surfacewater-climatechange-low']
    }),
    vtLayer({
      name: `${surfaceWaterBaseName}_1_in_100_CCP1_Depths`,
      model: '_Model_Origin_Layer_gdb',
      query: ['surfacewater-climatechange-medium']
    }),
    vtLayer({
      name: `${surfaceWaterBaseName}_1_in_30_CCP1_Depths`,
      model: '_Model_Origin_Layer_gdb',
      query: ['surfacewater-climatechange-high']
    })
  ]
}

function setStyleLayerColors (vectorTileLayer) {
  const { layers: styleLayers } = vectorTileLayer.styleRepository
  styleLayers.forEach((styleLayer) => {
    const paintProperties = vectorTileLayer.getPaintProperties(styleLayer.id)
    // Set fill colour
    const fillColor = styleLayerConfig[styleLayer.id]?.['fill-color']?.[mapStyleId]
    if (fillColor) {
      paintProperties['fill-color'] = fillColor
    }
    // Set line colour
    const lineColor = styleLayerConfig[styleLayer.id]?.['line-color']?.[mapStyleId]
    if (lineColor) {
      paintProperties['line-color'] = lineColor
    }
    // Set surface water depth fill colors
    if (styleLayer.id.includes(surfaceWaterBaseId)) {
      const fillColor = styleLayerConfig[styleLayer.id]?.['fill-color']?.[mapStyleId]
      paintProperties['fill-color'] = dataset.includes('bydepth') ? fillColor : depthFlatFills[mapStyleId]
    }
    // Set new paint properties
    vectorTileLayer.setPaintProperties(styleLayer.id, paintProperties)
    // Set flood zone pattern fill visibility (styleLayer)
    const mapStyles = styleLayerConfig[styleLayer.id]?.['map-styles']
    if (mapStyles) {
      vectorTileLayer.setStyleLayerVisibility(styleLayer.id, mapStyles.includes(mapStyleId) ? 'visible' : 'none')
    }
  })
}

function setLayerVisibility () {
  Object.values(vectorTileLayersConfig).flatMap(layersArray => layersArray).forEach(layer => {
    const vectorTileLayer = map.allLayers.find(l => l.id === layer.name)
    // Set vectorTileLayerVisibility
    if (dataset.includes('floodzones')) {
      vectorTileLayer.visible = layer.query.includes(dataset)
    } else {
      vectorTileLayer.visible = layer.query.includes(dataset.slice(0, dataset.lastIndexOf('-')))
    }
    // Set surface water styleLayer visibility
    if (dataset.includes('surfacewater') && vectorTileLayer.id.includes(surfaceWaterBaseName)) {
      vectorTileLayer.when(() => {
        setSurfaceWaterStyleLayerVisibility (vectorTileLayer)
        setStyleLayerColors (vectorTileLayer)
      })
    }
  })
}

function setSurfaceWaterStyleLayerVisibility (vectorTileLayer) {
  const querySegment = dataset.slice(dataset.lastIndexOf('-') + 1)
  const { layers: styleLayers } = vectorTileLayer.styleRepository
  styleLayers.forEach((styleLayer) => {
    const parsedQuerySegment = querySegment.replace(/^above/, '').replace(/depths$/, '')
    const isVisbile = querySegment === 'bydepth' || styleLayerConfig[styleLayer.id].levels.includes(parsedQuerySegment)
    vectorTileLayer.setStyleLayerVisibility(styleLayer.id, isVisbile ? 'visible' : 'none')
  })
}

// =======================
// Map features
// =======================

const mapFeatureLayersConfig = {
  flooddefence: 'nat_defences',
  waterstorage: 'nat_fsa',
  mainrivers: 'Statutory_Main_River_Map'
}

function mapFeatureRenderer () { return {
  flooddefence: {
    type: 'simple',
    symbol: {
      type: 'simple-line',
      width: '3px',
      color: COLOURS.floodDefences[mapStyleId] || COLOURS.floodDefences['outdoor']
    }
  },
  waterstorage: {
    type: 'simple',
    symbol: {
      type: 'simple-fill',
      style: 'diagonal-cross',
      color: COLOURS.waterStorage[mapStyleId] || COLOURS.waterStorage['outdoor'],
      outline: {
        color: COLOURS.waterStorage[mapStyleId] || COLOURS.waterStorage['outdoor'],
        width: 1
      }
    }
  },
  mainrivers: {
    type: 'simple',
    symbol: {
      type: 'simple-line',
      width: '3px',
      color: COLOURS.mainRivers[mapStyleId] || COLOURS.mainRivers['outdoor']
    }
  }
}}

function setFeatureLayerVisibility () {
  Object.entries(mapFeatureLayersConfig).forEach(([key, _value]) => {
    const featureLayer = map.findLayerById(key)
    featureLayer.visible = mapFeatures.includes(key)
  })
}

// =======================
// Public methods
// =======================

function addVectorTileLayers (mapProvider, datasetQueryParam) {
  // Set state
  map = mapProvider.map
  mapStyleId = mapProvider.mapStyleId
  dataset = datasetQueryParam

  // Add group and vector tile layers
  Object.entries(vectorTileLayersConfig).forEach(([groupKey, layersConfig]) => {
    const groupLayer = new GroupLayer({
      id: groupKey,
      opacity: 0.75,
      layers: layersConfig.map(layer => {
        const vectorTileLayer = new VectorTileLayer({
          id: layer.name,
          url: `https://tiles.arcgis.com/tiles/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/${layer.name}${layer.version}/VectorTileServer`,
          visible: layer.query.includes(dataset)
        })
        vectorTileLayer.when(() => {
          setStyleLayerColors(vectorTileLayer)
        })
        return vectorTileLayer
      })
    })
    mapProvider.map.add(groupLayer)
  })
  setLayerVisibility()
}

function addFeatureLayers (mapProvider, mapFeaturesQueryParam) {
  // Set state
  mapFeatures = mapFeaturesQueryParam?.split(',') || []

  // Loop through each feature layer in your config
  Object.entries(mapFeatureLayersConfig).forEach(([key, value]) => {
    mapProvider.map.add(new FeatureLayer({
      id: key,
      url: `https://services1.arcgis.com/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/${value}/FeatureServer`,
      renderer: mapFeatureRenderer(mapProvider.mapStyleId)[key],
      visible: mapFeatures.includes(key)
    }))
  })
}

function setDataset (newDataset) {
  // Update state
  dataset = newDataset

  setLayerVisibility()
}

function setMapFeatures (newMapFeatures) {
  // Update state
  mapFeatures = newMapFeatures.split(',')

  setFeatureLayerVisibility()
}

function setColors (newMapStyleId) {
  // Update state
  mapStyleId = newMapStyleId

  // Set dataset colours
  Object.values(vectorTileLayersConfig).flatMap(layersArray => layersArray).forEach(layer => {
    const vectorTileLayer = map.allLayers.find(l => l.id === layer.name)
    setStyleLayerColors(vectorTileLayer)
  })

  // Set map feature colours
  Object.entries(mapFeatureLayersConfig).forEach(([key, _value]) => {
    const featureLayer = map.findLayerById(key)
    const renderers = mapFeatureRenderer()
    featureLayer.renderer = renderers[featureLayer.id]
  })
}

export {
  addVectorTileLayers,
  addFeatureLayers,
  setDataset,
  setMapFeatures,
  setColors
}