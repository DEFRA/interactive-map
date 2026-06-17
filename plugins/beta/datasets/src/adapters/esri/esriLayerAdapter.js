import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer.js'
import { datasetRegistry } from '../../registry/datasetRegistry.js'
import { EsriDataset } from './registry/esriDataset.js'

export default class EsriLayerAdapter {
  constructor (mapProvider, symbolRegistry, patternRegistry) {
    this._mapProvider = mapProvider
    this._map = mapProvider.map
    // TODO: Implement symbolRegistry and patternRegistry usage in the adapter
    this._mapLayers = {}
  }

  createDataset (datasetDefinition) {
    return new EsriDataset(datasetDefinition)
  }

  async init (mapStyle) {
    // TODO - move some of this into a super LayerAdapter class that this extends
    const topLevelDatasets = datasetRegistry.topLevelDatasets()
    // ensure the datasets are added in order
    for await (const registryDataset of topLevelDatasets) {
      await this._addLayers(registryDataset, mapStyle)
    }
    await Promise.all(topLevelDatasets.map(registryDataset => this.applyDatasetVisibility(registryDataset.id)))
    console.log(this._map.layers.items.map(layer => layer.id))
  }

  async _addLayers (registryDataset, mapStyle) {
    console.log('Adding VectorTileLayer for dataset', registryDataset.id)
    const vectorTileLayer = new VectorTileLayer({
      id: registryDataset.id,
      url: registryDataset.tiles,
      opacity: 1,
      visible: false
    })
    await vectorTileLayer.load()
    console.log('VectorTileLayer loaded for dataset', registryDataset.id)
    registryDataset.sublayers.forEach(sublayer => {
      const { styleLayerId } = sublayer
      if (!styleLayerId) {
        return
      }
      const layerPaintProperties = vectorTileLayer.getPaintProperties(styleLayerId)
      if (layerPaintProperties) {
        vectorTileLayer.setPaintProperties(styleLayerId, sublayer.applyLayerPaintProperties(layerPaintProperties))
      }
    })
    this._mapLayers[registryDataset.id] = vectorTileLayer
    this._map.add(vectorTileLayer)
    console.log('Added VectorTileLayer for dataset', registryDataset.id)
    return vectorTileLayer.when()
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
    const registryDataset = datasetRegistry.getDataset(datasetId)
    const { id, isSublayer, visible } = registryDataset
    if (isSublayer) {
      const { parent, styleLayerId } = registryDataset
      const vectorTileLayer = this._mapLayers[parent.id]
      // console.log('SUBLAYER setStyleLayerVisibility', vectorTileLayer.id, styleLayerId)
      vectorTileLayer.setStyleLayerVisibility(styleLayerId, registryDataset.visibility)
      return
    } else if (visible) {
      const vectorTileLayer = this._mapLayers[datasetId]
      registryDataset.sublayers.forEach(sublayer => {
        const { styleLayerId } = sublayer
        if (!styleLayerId) {
          return
        }
        // console.log('setStyleLayerVisibility', datasetId, styleLayerId)
        vectorTileLayer.setStyleLayerVisibility(styleLayerId, sublayer.visibility)
      })
    }
    this._mapLayers[id].visible = registryDataset.visible
  }

  async applyGlobalVisibility (...args) {
    console.log('ESRI: applyGlobalVisibility', args)
  }

  async applyDatasetOpacity (...args) {
    console.log('ESRI: applyDatasetOpacity', args)
  }

  async applyGlobalOpacity (...args) {
    // console.log('ESRI: applyGlobalOpacity', args)
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
