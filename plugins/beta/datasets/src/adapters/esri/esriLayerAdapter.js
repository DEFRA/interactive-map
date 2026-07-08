import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer.js'
import GroupLayer from '@arcgis/core/layers/GroupLayer.js'
import { LayerAdapter } from '../layerAdapter.js'
import { datasetRegistry } from '../../registry/datasetRegistry.js'
import { EsriDataset } from './registry/esriDataset.js'

export default class EsriLayerAdapter extends LayerAdapter {
  constructor (mapProvider, symbolRegistry, patternRegistry) {
    super()
    this._mapProvider = mapProvider
    this._map = mapProvider.map
    // TODO: Implement symbolRegistry and patternRegistry usage in the adapter

    // _vectorTileLayers is a map of datasetId to VectorTileLayer instances
    // it includes stand alone vectorTileLayers and vectorTileLayers that are part of a groupLayer
    // but does not include group layers themselves, which are tracked in _groupLayers
    this._vectorTileLayers = {}

    // _vectorTileOpacityLayers is a map of datasetId to VectorTileLayer/GroupLayer where opacity is applied
    // it includes stand alone vectorTileLayers and groupLayers that contain vectorTileLayers
    // but does not include vectorTileLayers that are part of a groupLayer
    this._vectorTileOpacityLayers = {}

    // _groupLayers is a map of esriGroupId to GroupLayer
    this._groupLayers = {}
  }

  createDataset (datasetDefinition) {
    return new EsriDataset(datasetDefinition)
  }

  async init () {
    const topLevelDatasets = datasetRegistry.topLevelDatasets()
    // ensure the datasets are added in order
    for await (const registryDataset of topLevelDatasets) {
      await this._addLayers(registryDataset)
    }

    // onMapStyleChange: handles showing and hiding sublayers based on the current mapStyle
    // and updating the paint properties of the layers based on the dataset/mapStyle style
    await this.onMapStyleChange()

    // Apply opacity to all layers
    await this.applyGlobalOpacity()

    // Finally show all layers that are visible based on the dataset/mapStyle visibility
    await Promise.all(topLevelDatasets.map(registryDataset => this.applyDatasetVisibility(registryDataset.id)))
  }

  _addGroupLayer (esriGroupId) {
    // Either adds a new group layer to the map, or returns an existing one if it already exists
    if (!this._groupLayers[esriGroupId]) {
      const groupLayer = new GroupLayer({
        id: esriGroupId,
        opacity: 1,
        visible: true
      })
      this._groupLayers[esriGroupId] = groupLayer
      this._map.add(groupLayer)
    }
    return this._groupLayers[esriGroupId]
  }

  async _addLayers (registryDataset) {
    const { esriGroupId } = registryDataset
    const vectorTileParent = esriGroupId ? this._addGroupLayer(esriGroupId) : this._map
    const vectorTileLayer = new VectorTileLayer({
      id: registryDataset.id,
      url: registryDataset.tiles,
      opacity: 1,
      visible: false
    })
    this._vectorTileLayers[registryDataset.id] = vectorTileLayer
    this._vectorTileOpacityLayers[registryDataset.id] = esriGroupId ? vectorTileParent : vectorTileLayer
    vectorTileParent.add(vectorTileLayer)
    return vectorTileLayer.when()
  }

  async removeDataset (...args) {
    console.log('TODO: removeDataset', args)
  }

  async setData (...args) {
    console.log('TODO: setData', args)
  }

  async applyStyle (...args) {
    console.log('TODO: applyStyle', args)
  }

  _applyStyleLayerVisibility (sublayer, vectorTileLayer) {
    const { esriStyleLayerId } = sublayer
    if (!esriStyleLayerId) {
      return
    }
    vectorTileLayer.setStyleLayerVisibility(esriStyleLayerId, sublayer.visibility)
  }

  _applyRegistryDatasetVisibility (registryDataset) {
    // if this is a sublayer, we need to apply the visibility to the vectorTileLayers style sheet
    // if this is a top level dataset, we need to apply the visibility to the vectorTileLayer/ groupLayer itself
    const { id, isSublayer, visible, parentId } = registryDataset
    const vectorTileLayer = this._vectorTileLayers[isSublayer ? parentId : id]

    if (isSublayer) {
      this._applyStyleLayerVisibility(registryDataset, vectorTileLayer)
      // Don't apply the visibility change to the parent, since the parent may have other sublayers that are visible
      return
    } else if (visible) {
      // No need to apply style layer visibility for datasets that are hidden
      registryDataset.sublayers.forEach(sublayer => this._applyStyleLayerVisibility(sublayer, vectorTileLayer))
    }
    vectorTileLayer.visible = visible
  }

  async applyDatasetVisibility (datasetId) {
    const registryDataset = datasetRegistry.getDataset(datasetId)
    if (registryDataset) {
      this._applyRegistryDatasetVisibility(registryDataset)
    }
  }

  async applyGlobalVisibility () {
    datasetRegistry.forEachDataset(registryDataset => this._applyRegistryDatasetVisibility(registryDataset))
  }

  async applyDatasetOpacity (datasetId) {
    const vectorTileLayer = this._vectorTileOpacityLayers[datasetId]
    const registryDataset = datasetRegistry.getDataset(datasetId)
    if (vectorTileLayer && registryDataset) {
      vectorTileLayer.opacity = registryDataset.opacity
    }
  }

  async applyGlobalOpacity () {
    Object.entries(this._vectorTileOpacityLayers).forEach(([datasetId, vectorTileLayer]) => {
      const registryDataset = datasetRegistry.getDataset(datasetId)
      if (registryDataset) {
        vectorTileLayer.opacity = registryDataset.opacity
      }
    })
  }

  async addDataset (...args) {
    console.log('TODO: addDataset', args)
  }

  async applyFeatureFilter (...args) {
    console.log('TODO: applyFeatureFilter', args)
  }

  async onMapStyleChange () {
    datasetRegistry.forEach(registryDataset => {
      const { id, isSublayer, esriStyleLayerId, parent } = registryDataset
      const vectorTileLayer = this._vectorTileLayers[isSublayer ? parent.id : id]
      if (vectorTileLayer && esriStyleLayerId) {
        // Show hide the style layer based on the dataset's mapStyle visibility
        vectorTileLayer.setStyleLayerVisibility(esriStyleLayerId, registryDataset.visibility)
        if (registryDataset.useServerStyle) {
          // If the dataset is using the server style, we don't need to apply any paint properties
          return
        }
        // Update the paint properties of the style layer based on the dataset's mapStyle style
        const layerPaintProperties = vectorTileLayer.getPaintProperties(esriStyleLayerId)
        if (layerPaintProperties) {
          registryDataset.applyLayerPaintProperties(layerPaintProperties)
          vectorTileLayer.setPaintProperties(esriStyleLayerId, registryDataset.applyLayerPaintProperties(layerPaintProperties))
        }
      }
    })
    // TODO - handle dynamic sources
  }

  // onMapSizeChange is not applicable to the esriLayerAdapter
  async onMapSizeChange () {}
}
