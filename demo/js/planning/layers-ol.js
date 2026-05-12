import TileGrid from 'ol/tilegrid/TileGrid.js'
import VectorTileSource from 'ol/source/VectorTile.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import MVT from 'ol/format/MVT.js'
import LayerGroup from 'ol/layer/Group.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import { bbox } from 'ol/loadingstrategy.js'
import { Style, Fill, Stroke } from 'ol/style.js'
import { stylefunction } from 'ol-mapbox-style'
import { getEsriToken } from '../auth.js'
import { COLOURS } from './colours.js'

// =======================
// State
// =======================

let mapStyleId
let dataset
let mapFeatures = []
const vtLayerData = {} // name → { layer, styleJson, sourceId, resolutions }
const featureLayerMap = {} // key → OL VectorLayer

// =======================
// Config (mirrors layers.js)
// =======================

const VTS_ORG = 'https://tiles.arcgis.com/tiles/JZM7qJpmv7vJ0Hzx/arcgis/rest/services'
const FS_ORG = 'https://services1.arcgis.com/JZM7qJpmv7vJ0Hzx/arcgis/rest/services'
const CRS = 'EPSG:27700'

const depthRampFills = [
  { label: '>2300mm', color: COLOURS['>2300mm'], levels: ['all', '150', '300', '600', '900', '1200', '2300'] },
  { label: '1200-2300mm', color: COLOURS['1200-2300mm'], levels: ['all', '150', '300', '600', '900', '1200'] },
  { label: '900-1200mm', color: COLOURS['900-1200mm'], levels: ['all', '150', '300', '600', '900'] },
  { label: '600-900mm', color: COLOURS['600-900mm'], levels: ['all', '150', '300', '600'] },
  { label: '300-600mm', color: COLOURS['300-600mm'], levels: ['all', '150', '300'] },
  { label: '150-300mm', color: COLOURS['150-300mm'], levels: ['all', '150'] },
  { label: '<150mm', color: COLOURS['<150mm'], levels: ['all'] }
]

const floodZone = (suffix, style) => ({ [`Flood Zones 2 and 3 Rivers and Sea${suffix}`]: style })
const props = d => ({ 'fill-color': d.color, levels: d.levels })
const surfaceWaterBaseId = 'Surface Water Spatial Planning'
const entriesFromDepthFills = mapper => Object.fromEntries(depthRampFills.map(d => mapper(d)))

const styleLayerConfig = {
  ...floodZone('/Flood Zone 3/1', { 'fill-color': COLOURS.floodZone3 }),
  ...floodZone('/Flood Zone 2/1', { 'fill-color': COLOURS.floodZone2 }),
  ...floodZone(' CCP1/Flood Zones plus climate change/1', { 'fill-color': COLOURS.floodZoneClimateChange }),
  ...floodZone(' CCP1/Unavailable/2', { 'map-styles': ['dark'] }),
  ...floodZone(' CCP1/Unavailable/1', { 'map-styles': ['outdoor', 'black-and-white'] }),
  ...floodZone(' CCP1/Unavailable/0', { 'line-color': COLOURS.floodZoneClimateChangeNoData }),
  ...entriesFromDepthFills(d => [`${surfaceWaterBaseId} 1 in 1000 Depths/${d.label}/1`, props(d)]),
  ...entriesFromDepthFills(d => [`${surfaceWaterBaseId} 1 in 100 Depths/${d.label}/1`, props(d)]),
  ...entriesFromDepthFills(d => [`${surfaceWaterBaseId} 1 in 30 Depths/${d.label}/1`, props(d)]),
  ...entriesFromDepthFills(d => [`${surfaceWaterBaseId} 1 in 1000 CCP1 Depths/${d.label}/1`, props(d)]),
  ...entriesFromDepthFills(d => [`${surfaceWaterBaseId} 1 in 100 CCP1 Depths/${d.label}/1`, props(d)]),
  ...entriesFromDepthFills(d => [`${surfaceWaterBaseId} 1 in 30 CCP1 Depths/${d.label}/1`, props(d)])
}

const vtLayer = ({ name, model, query, version = '_NON_PRODUCTION' }) => ({ name, version, model, query })
const floodZonesBaseName = 'Flood_Zones_2_and_3_Rivers_and_Sea'
const surfaceWaterBaseName = 'Surface_Water_Spatial_Planning'
const MODEL_ORIGIN = '_Model_Origin_Layer'

const vectorTileLayersConfig = {
  floodzones: [
    vtLayer({ name: `${floodZonesBaseName}_CCP1`, model: '_depth_Model_Origin_Layer_gdb', query: ['floodzones-climatechange'] }),
    vtLayer({ name: floodZonesBaseName, model: MODEL_ORIGIN, query: ['floodzones-climatechange', 'floodzones-presentday'] })
  ],
  surfacewater: [
    vtLayer({ name: `${surfaceWaterBaseName}_1_in_1000_Depths`, model: '_depth_Model_Origin_Layer_gdb2', query: ['surfacewater-presentday-low'] }),
    vtLayer({ name: `${surfaceWaterBaseName}_1_in_100_Depths`, model: '_depth_Model_Origin_Layer_gdb', query: ['surfacewater-presentday-medium'] }),
    vtLayer({ name: `${surfaceWaterBaseName}_1_in_30_Depths`, model: MODEL_ORIGIN, query: ['surfacewater-presentday-high'] }),
    vtLayer({ name: `${surfaceWaterBaseName}_1_in_1000_CCP1_Depths`, model: MODEL_ORIGIN, query: ['surfacewater-climatechange-low'] }),
    vtLayer({ name: `${surfaceWaterBaseName}_1_in_100_CCP1_Depths`, model: '_Model_Origin_Layer_gdb', query: ['surfacewater-climatechange-medium'] }),
    vtLayer({ name: `${surfaceWaterBaseName}_1_in_30_CCP1_Depths`, model: '_Model_Origin_Layer_gdb', query: ['surfacewater-climatechange-high'] })
  ]
}

const mapFeatureLayersConfig = {
  flooddefence: 'nat_defences',
  waterstorage: 'nat_fsa',
  mainrivers: 'Statutory_Main_River_Map'
}

const mapFeatureColours = {
  flooddefence: COLOURS.floodDefences,
  waterstorage: COLOURS.waterStorage,
  mainrivers: COLOURS.mainRivers
}

// =======================
// Style helpers
// =======================

const hatchPatternCache = {}

function getHatchFill (colour) {
  if (!hatchPatternCache[colour]) {
    const canvas = document.createElement('canvas')
    canvas.width = 8
    canvas.height = 8
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = colour
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, 8)
    ctx.lineTo(8, 0)
    ctx.stroke()
    hatchPatternCache[colour] = ctx.createPattern(canvas, 'repeat')
  }
  return hatchPatternCache[colour]
}

function makeFeatureStyle (key) {
  const colour = mapFeatureColours[key][mapStyleId] || mapFeatureColours[key].outdoor
  if (key === 'waterstorage') {
    return new Style({
      fill: new Fill({ color: getHatchFill(colour) }),
      stroke: new Stroke({ color: colour, width: 1 })
    })
  }
  return new Style({ stroke: new Stroke({ color: colour, width: 3 }) })
}

// =======================
// VectorTile style management
// =======================

function applyFillStyle (styleLayer, config) {
  const fill = config['fill-color']
  if (!fill) { return }
  if (styleLayer.id.includes(surfaceWaterBaseId)) {
    const depthColor = fill[mapStyleId] || fill.outdoor
    const flatColor = COLOURS.extent[mapStyleId] || COLOURS.extent.outdoor
    styleLayer.paint['fill-color'] = dataset?.includes('bydepth') ? depthColor : flatColor
  } else {
    styleLayer.paint['fill-color'] = fill[mapStyleId] || fill.outdoor
  }
}

function applySurfaceWaterDepthVisibility (styleLayer, config, querySegment) {
  if (!styleLayer.id.includes(surfaceWaterBaseId) || !config.levels) { return }
  const parsed = querySegment.replace(/^above/, '').replace(/depths$/, '')
  styleLayer.layout.visibility = querySegment === 'bydepth' || config.levels.includes(parsed) ? 'visible' : 'none'
}

function applyStyleLayerProps (styleLayer, querySegment) {
  const config = styleLayerConfig[styleLayer.id]
  if (!config) { return }

  if (!styleLayer.paint) { styleLayer.paint = {} }
  if (!styleLayer.layout) { styleLayer.layout = {} }

  applyFillStyle(styleLayer, config)

  const line = config['line-color']
  if (line) {
    styleLayer.paint['line-color'] = line[mapStyleId] || line.outdoor
  }

  const mapStyles = config['map-styles']
  if (mapStyles) {
    styleLayer.layout.visibility = mapStyles.includes(mapStyleId) ? 'visible' : 'none'
  }

  applySurfaceWaterDepthVisibility(styleLayer, config, querySegment)
}

function refreshLayerStyle (name) {
  const data = vtLayerData[name]
  if (!data) { return }
  const { layer, styleJson, sourceId, resolutions } = data
  const querySegment = dataset ? dataset.slice(dataset.lastIndexOf('-') + 1) : ''
  styleJson.layers.forEach(styleLayer => applyStyleLayerProps(styleLayer, querySegment))
  delete styleJson.id
  stylefunction(layer, styleJson, sourceId, resolutions)
}

function setLayerVisibility () {
  Object.values(vectorTileLayersConfig).flat().forEach(layerConfig => {
    const data = vtLayerData[layerConfig.name]
    if (!data) { return }
    const isVisible = dataset.includes('floodzones')
      ? layerConfig.query.includes(dataset)
      : layerConfig.query.includes(dataset.slice(0, dataset.lastIndexOf('-')))
    data.layer.setVisible(isVisible)
    if (isVisible && dataset.includes('surfacewater') && layerConfig.name.includes(surfaceWaterBaseName)) {
      refreshLayerStyle(layerConfig.name)
    }
  })
}

function setFeatureLayerVisibility () {
  Object.keys(mapFeatureLayersConfig).forEach(key => {
    featureLayerMap[key]?.setVisible(mapFeatures.includes(key))
  })
}

// =======================
// ArcGIS VectorTile factory
// =======================

async function createArcGISVTL (serviceUrl, token) {
  const [capabilities, styleJson] = await Promise.all([
    fetch(`${serviceUrl}?f=json&token=${token}`).then(r => r.json()),
    fetch(`${serviceUrl}/resources/styles/root.json?token=${token}`).then(r => r.json())
  ])

  const { fullExtent, tileInfo } = capabilities
  const extent = [fullExtent.xmin, fullExtent.ymin, fullExtent.xmax, fullExtent.ymax]
  const origin = [tileInfo.origin.x, tileInfo.origin.y]
  const resolutions = tileInfo.lods.map(l => l.resolution).slice(0, 16)
  const tileGrid = new TileGrid({ extent, origin, resolutions, tileSize: tileInfo.rows })
  const sourceId = Object.keys(styleJson.sources)[0]

  const source = new VectorTileSource({
    format: new MVT(),
    url: `${serviceUrl}/tile/{z}/{y}/{x}.pbf?token=${token}`,
    projection: CRS,
    tileGrid
  })

  const layer = new VectorTileLayer({ source, renderMode: 'vector' })
  stylefunction(layer, styleJson, sourceId, resolutions)

  return { layer, styleJson, sourceId, resolutions }
}

// =======================
// Public functions
// =======================

async function addVectorTileLayers (mapProvider, datasetQueryParam) {
  mapStyleId = mapProvider.mapStyleId
  dataset = datasetQueryParam
  const map = mapProvider.map
  const token = await getEsriToken()

  await Promise.all(
    Object.entries(vectorTileLayersConfig).map(async ([_groupKey, layersConfig]) => {
      const layers = await Promise.all(
        layersConfig.map(async (layerConfig) => {
          const serviceUrl = `${VTS_ORG}/${layerConfig.name}${layerConfig.version}/VectorTileServer`
          const data = await createArcGISVTL(serviceUrl, token)
          vtLayerData[layerConfig.name] = data
          refreshLayerStyle(layerConfig.name)
          return data.layer
        })
      )
      map.addLayer(new LayerGroup({ opacity: 0.75, layers }))
    })
  )

  setLayerVisibility()
}

async function addFeatureLayers (mapProvider, mapFeaturesQueryParam) {
  mapFeatures = mapFeaturesQueryParam?.split(',').filter(Boolean) || []
  const map = mapProvider.map
  const token = await getEsriToken()

  const format = new GeoJSON({ dataProjection: CRS, featureProjection: CRS })

  Object.entries(mapFeatureLayersConfig).forEach(([key, value]) => {
    const url = (extent) => {
      const [xmin, ymin, xmax, ymax] = extent
      return `${FS_ORG}/${value}/FeatureServer/0/query?geometry=${xmin},${ymin},${xmax},${ymax}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&inSR=27700&where=1%3D1&outFields=*&returnGeometry=true&f=geojson&outSR=27700&token=${token}`
    }
    const layer = new VectorLayer({
      source: new VectorSource({ format, url, strategy: bbox }),
      style: makeFeatureStyle(key),
      visible: mapFeatures.includes(key),
      zIndex: 10
    })
    featureLayerMap[key] = layer
    map.addLayer(layer)
  })
}

function setDataset (newDataset) {
  dataset = newDataset
  setLayerVisibility()
}

function setMapFeatures (newMapFeatures) {
  mapFeatures = newMapFeatures.split(',').filter(Boolean)
  setFeatureLayerVisibility()
}

function setColors (newMapStyleId) {
  mapStyleId = newMapStyleId
  Object.keys(vtLayerData).forEach(name => refreshLayerStyle(name))
  Object.keys(mapFeatureLayersConfig).forEach(key => {
    featureLayerMap[key]?.setStyle(makeFeatureStyle(key))
  })
}

export { addVectorTileLayers, addFeatureLayers, setDataset, setMapFeatures, setColors }
