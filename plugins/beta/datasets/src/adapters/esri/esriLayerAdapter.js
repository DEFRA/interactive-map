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
    // Handles showing and hiding sublayers based on the mapStyle
    // and updating the paint properties of the layers based on the dataset/mapStyle style
    await this.onMapStyleChange(datasetRegistry.mapStyle, null)
    await Promise.all(topLevelDatasets.map(registryDataset => this.applyDatasetVisibility(registryDataset.id)))
  }

  async _addLayers (registryDataset, mapStyle) {
    const vectorTileLayer = new VectorTileLayer({
      id: registryDataset.id,
      url: registryDataset.tiles,
      opacity: 1,
      visible: false
    })
    await vectorTileLayer.load()
    this._mapLayers[registryDataset.id] = vectorTileLayer
    this._map.add(vectorTileLayer)
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

  _applyStyleLayerVisibility (sublayer, vectorTileLayer) {
    const { esriStyleLayerId } = sublayer
    if (!esriStyleLayerId) {
      return
    }
    vectorTileLayer.setStyleLayerVisibility(esriStyleLayerId, sublayer.visibility)
  }

  async applyDatasetVisibility (datasetId) {
    const registryDataset = datasetRegistry.getDataset(datasetId)
    const { id, isSublayer, visible, parentId } = registryDataset
    const vectorTileLayer = this._mapLayers[isSublayer ? parentId : id]
    if (isSublayer) {
      this._applyStyleLayerVisibility(registryDataset, vectorTileLayer)
      return
    } else if (visible) {
      registryDataset.sublayers.forEach(sublayer => this._applyStyleLayerVisibility(sublayer, vectorTileLayer))
    }
    this._mapLayers[id].visible = visible
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

  async onMapStyleChange (newMapStyle, dynamicSources) {
    if (datasetRegistry.mapStyle.id !== newMapStyle.id) {
      // Ensure the datasetRegistry is aware of the new mapStyle so that the visibility and style properties of the datasets can be correctly applied
      // TODO - this is a bit of a hack, we should probably have a better way to handle this
      // such as having DatasetsInit listen for a mapStyle change event and then call datasetRegistry.attach with the new mapStyle
      // and finally trigger this method
      datasetRegistry.attach(datasetRegistry.datasets, datasetRegistry._orderedDatasets, newMapStyle)
    }
    datasetRegistry.forEach(registryDataset => {
      const { id, isSublayer, esriStyleLayerId, parent } = registryDataset
      const vectorTileLayer = this._mapLayers[isSublayer ? parent.id : id]
      if (vectorTileLayer && esriStyleLayerId) {
        // Show hide the style layer based on the dataset's mapStyle visibility
        vectorTileLayer.setStyleLayerVisibility(esriStyleLayerId, registryDataset.visibility)
        // Update the paint properties of the style layer based on the dataset's mapStyle style
        const layerPaintProperties = vectorTileLayer.getPaintProperties(esriStyleLayerId)
        if (layerPaintProperties) {
          vectorTileLayer.setPaintProperties(esriStyleLayerId, registryDataset.applyLayerPaintProperties(layerPaintProperties))
        }
      }
    })
    // TODO - handle dynamic sources
  }

  async onMapSizeChange (...args) {
    console.log('ESRI: onMapSizeChange', args)
  }
}
