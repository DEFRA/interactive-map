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
    console.log('adding layers')
    const topLevelDatasets = datasetRegistry.topLevelDatasets()
    await Promise.all(topLevelDatasets.map(registryDataset => this._addLayers(registryDataset, mapStyle)))
    await Promise.all(topLevelDatasets.map(registryDataset => this.applyDatasetVisibility(registryDataset.id)))
  }

  async _addLayers (registryDataset, mapStyle) {
    console.log('Creating Esri VectorTileLayer for dataset', registryDataset.id)
    const vectorTileLayer = new VectorTileLayer({
      id: registryDataset.id,
      url: registryDataset.tiles,
      opacity: 1,
      visible: false
    })
    await vectorTileLayer.load()

    registryDataset.sublayers.forEach(sublayer => {
      const { styleLayerId, style, hasStroke, hasFill } = sublayer
      if (!styleLayerId) {
        return
      }
      const layerPaintProperties = vectorTileLayer.getPaintProperties(styleLayerId)
      if (layerPaintProperties) {
        console.log('VectorTileLayer styleLayer paint properties', styleLayerId, layerPaintProperties)
        if (hasStroke) {
          layerPaintProperties['line-color'] = getValueForStyle(style.stroke, mapStyle.id)
        }
        if (hasFill) {
          layerPaintProperties['fill-color'] = getValueForStyle(style.fill, mapStyle.id)
        }
        console.log('VectorTileLayer updated paint properties', styleLayerId, layerPaintProperties)
        vectorTileLayer.setPaintProperties(styleLayerId, layerPaintProperties)
      }
    })
    this._mapLayers[registryDataset.id] = vectorTileLayer
    this._map.add(vectorTileLayer)
    console.log('finished adding layers')
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
    console.log('ESRI: applyDatasetVisibility', datasetId)
    const registryDataset = datasetRegistry.getDataset(datasetId)
    const { id, isSublayer, visible } = registryDataset
    if (isSublayer) {
      const { parent, styleLayerId } = registryDataset
      const vectorTileLayer = this._mapLayers[parent.id]
      console.log('SUBLAYER setStyleLayerVisibility', vectorTileLayer.id, styleLayerId)
      vectorTileLayer.setStyleLayerVisibility(styleLayerId, registryDataset.visibility)
      return
    } else if (visible) {
      const vectorTileLayer = this._mapLayers[datasetId]
      registryDataset.sublayers.forEach(sublayer => {
        const { styleLayerId } = sublayer
        if (!styleLayerId) {
          return
        }
        console.log('setStyleLayerVisibility', datasetId, styleLayerId)
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
