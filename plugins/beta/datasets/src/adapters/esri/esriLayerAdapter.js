import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer.js'
import { datasetRegistry } from '../../registry/datasetRegistry.js'
import { getValueForStyle } from '../../../../../../src/utils/getValueForStyle.js'

export default class EsriLayerAdapter {
  constructor (mapProvider, symbolRegistry, patternRegistry) {
    this._mapProvider = mapProvider
    this._map = mapProvider.map
    // TODO: Implement symbolRegistry and patternRegistry usage in the adapter
    this._mapLayers = {}
  }

  async init (mapStyle) {
    // TODO - move some of this into a super LayerAdapter class that this extends
    datasetRegistry.forEachDataset(registryDataset => this._addLayers(registryDataset, mapStyle))
  }

  async _addLayers (registryDataset, mapStyle) {
    console.log('Creating Esri VectorTileLayer for dataset', registryDataset.id)
    const vectorTileLayer = new VectorTileLayer({
      id: registryDataset.id,
      url: registryDataset.tiles,
      opacity: 1,
      visible: registryDataset.visible
    })
    await vectorTileLayer.load()
    await vectorTileLayer.when()
    console.log('vectorTileLayer.style', vectorTileLayer.style)
    // console.log('VectorTileLayer loaded', vectorTileLayer)
    // console.log('VectorTileLayer currentStyleInfo', vectorTileLayer.currentStyleInfo)
    const { styleRepository = {} } = vectorTileLayer
    // const { layers: styleLayers = [] } = styleRepository
    const styleLayers = JSON.parse(JSON.stringify(styleRepository.layers))
    console.log('VectorTileLayer styleLayers', registryDataset.id, JSON.parse(JSON.stringify(styleLayers)))
    styleLayers.forEach((styleLayer) => {
      console.log('Deleting VectorTileLayer styleLayer', styleLayer.id)
      vectorTileLayer.deleteStyleLayer(styleLayer.id)
    })

    registryDataset.sublayers.forEach(sublayer => {
      // const style = vectorTileLayer.getStyleLayer(sublayer.styleLayerId)
      // console.log('Sublayer', sublayer.id, sublayer.styleLayerId, style)
      // vectorTileLayer.deleteStyleLayer(sublayer.styleLayerId)
      const newStyle = {
        id: sublayer.id,
        type: 'fill',
        paint: {
          'fill-color': getValueForStyle(sublayer.style.fill, mapStyle.id)
        },
        source: 'esri',
        'source-layer': sublayer.sourceLayer,
        filter: sublayer.style.filter
      }
      vectorTileLayer.setStyleLayer(newStyle)
      const addedStyle = vectorTileLayer.getStyleLayer(newStyle.id)
      console.log('Added style layer', addedStyle)
    })

    console.log('VectorTileLayer styleLayers', JSON.parse(JSON.stringify(styleRepository.layers)))

    // const styleUrl =
    //   `${registryDataset.tiles}/resources/styles/root.json`

    // const style = await fetch(styleUrl).then(r => r.json())
    // console.log('style', style)

    this._mapLayers[registryDataset.id] = vectorTileLayer
    this._map.add(vectorTileLayer)
  }

  async removeDataset (...args) {
    console.log('ESRI: removeDataset', args)
  }

  async setData (...args) {
    console.log('ESRI: setData', args)
  }

  async applyStyle (...args) {
    console.log('ESRI: applyStyle', args)
  }

  async applyDatasetVisibility (datasetId) {
    console.log('ESRI: applyDatasetVisibility', datasetId)
    const registryDataset = datasetRegistry.getDataset(datasetId)
    const { id, isSublayer } = registryDataset
    if (isSublayer) {
      const { parent, styleLayerId } = registryDataset
      const parentLayer = this._mapLayers[parent.id]
      parentLayer.setStyleLayerVisibility(styleLayerId, registryDataset.visibility)
      return
    }
    this._mapLayers[id].visible = registryDataset.visible
    // this._map.getLayer(id).visible = registryDataset.visible
  }

  async applyGlobalVisibility (...args) {
    console.log('ESRI: applyGlobalVisibility', args)
  }

  async applyDatasetOpacity (...args) {
    console.log('ESRI: applyDatasetOpacity', args)
  }

  async applyGlobalOpacity (...args) {
    console.log('ESRI: applyGlobalOpacity', args)
  }

  async addDataset (...args) {
    console.log('ESRI: addDataset', args)
  }

  async applyFeatureFilter (...args) {
    console.log('ESRI: applyFeatureFilter', args)
  }

  async onMapStyleChange (...args) {
    console.log('ESRI: onMapStyleChange', args)
  }

  async onMapSizeChange (...args) {
    console.log('ESRI: onMapSizeChange', args)
  }
}
