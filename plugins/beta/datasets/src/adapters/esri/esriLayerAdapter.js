import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer.js'
import { datasetRegistry } from '../../registry/datasetRegistry.js'

export default class EsriLayerAdapter {
  constructor (mapProvider, symbolRegistry, patternRegistry) {
    this._mapProvider = mapProvider
    this._map = mapProvider.map
    // TODO: Implement symbolRegistry and patternRegistry usage in the adapter
  }

  async init (mapStyle) {
    // TODO - move some of this into a super LayerAdapter class that this extends
    datasetRegistry.forEachDataset(registryDataset => this._addLayers(registryDataset, mapStyle))
  }

  _addLayers (registryDataset, mapStyle) {
    console.log('Creating Esri VectorTileLayer for dataset', registryDataset.id)
    const vectorTileLayer = new VectorTileLayer({
      id: registryDataset.id,
      url: registryDataset.tiles,
      opacity: 1,
      visible: registryDataset.visible
    })
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

  async applyDatasetVisibility (...args) {
    console.log('ESRI: applyDatasetVisibility', args)
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
