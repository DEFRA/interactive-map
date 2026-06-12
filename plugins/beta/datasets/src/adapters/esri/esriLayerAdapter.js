import { datasetRegistry } from '../../registry/datasetRegistry.js'

export default class EsriLayerAdapter {
  async init (mapStyle) {
    console.log('EsriLayerAdapter init', mapStyle)
    // datasetRegistry.forEachDataset(registryDataset => this._addLayers(registryDataset, mapStyle))
    // await new Promise(resolve => this._map.once('idle', resolve))
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
