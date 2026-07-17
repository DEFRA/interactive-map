import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer.js'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js'
import GroupLayer from '@arcgis/core/layers/GroupLayer.js'
import { LayerAdapter } from '../layerAdapter.js'
import { datasetRegistry } from '../../registry/datasetRegistry.js'
import { EsriDataset } from './registry/esriDataset.js'
import { logger } from '../../../../../src/services/logger.js'

export default class EsriLayerAdapter extends LayerAdapter {
  constructor (mapProvider) {
    super()
    this._mapProvider = mapProvider
    this._map = mapProvider.map

    // _mapVisibilityLayers is a map of datasetId to VectorTileLayer or FeatureLayer instances
    // it includes stand alone vectorTileLayers and vectorTileLayers that are part of a groupLayer
    // but does not include group layers themselves, which are tracked in _groupLayers
    this._mapVisibilityLayers = {}

    // _mapOpacityLayers is a map of datasetId to mapLayers where opacity is applied
    // it includes featureLayers, vectorTileLayers and groupLayers
    // but does not include vectorTileLayers that are part of a groupLayer
    this._mapOpacityLayers = {}

    // _groupLayers is a map of esriGroupId to GroupLayer
    this._groupLayers = {}
  }

  createDataset (datasetDefinition) {
    return new EsriDataset(datasetDefinition)
  }

  async init () {
    const topLevelDatasets = datasetRegistry.topLevelDatasets()
    // ensure the datasets are added in order
    for (const registryDataset of topLevelDatasets) {
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

  async _addFeatureLayers (registryDataset) {
    const featureLayer = new FeatureLayer({
      id: registryDataset.id,
      url: registryDataset.tiles,
      renderer: registryDataset.renderer,
      opacity: 1,
      visible: false
    })
    this._mapVisibilityLayers[registryDataset.id] = featureLayer
    this._mapOpacityLayers[registryDataset.id] = featureLayer
    try {
      this._map.add(featureLayer)
      return featureLayer.when()
    } catch (error) {
      logger.error(`Error adding FeatureLayer for dataset ${registryDataset.id}:`, error)
    }
    return Promise.resolve() // Return a resolved promise to avoid unhandled promise rejection
  }

  async _addLayers (registryDataset) {
    const { type, esriGroupId } = registryDataset

    if (type === 'FeatureService') {
      return this._addFeatureLayers(registryDataset)
    }

    const vectorTileParent = esriGroupId ? this._addGroupLayer(esriGroupId) : this._map
    const vectorTileLayer = new VectorTileLayer({
      id: registryDataset.id,
      url: registryDataset.tiles,
      opacity: 1,
      visible: false
    })
    this._mapVisibilityLayers[registryDataset.id] = vectorTileLayer
    this._mapOpacityLayers[registryDataset.id] = esriGroupId ? vectorTileParent : vectorTileLayer
    vectorTileParent.add(vectorTileLayer)
    return vectorTileLayer.when()
  }

  async addDataset (datasetId) {
    const registryDataset = datasetRegistry.getDataset(datasetId)
    if (!registryDataset) {
      logger.warn(`addDataset called, but Dataset with id ${datasetId} not found in registry`)
      return
    }
    await this._addLayers(registryDataset)
    const { parentId } = registryDataset
    const vectorTileLayer = this._mapVisibilityLayers[parentId || datasetId]
    this.applyDatasetOpacity(datasetId)
    this._applyStyleLayerPaintProperties(registryDataset, vectorTileLayer)
    this.applyDatasetVisibility(datasetId)
  }

  async removeDataset (datasetId) {
    const registryDataset = datasetRegistry.getDataset(datasetId)
    if (!registryDataset) {
      return
    }
    const { esriGroupId } = registryDataset
    const vectorTileLayer = this._mapVisibilityLayers[datasetId]
    // If the dataset is part of a group layer, we need to remove it from the group layer
    const groupLayer = esriGroupId ? this._groupLayers[esriGroupId] : null
    const vectorTileParent = groupLayer || this._map

    if (vectorTileLayer) {
      // Remove the vectorTileLayer from the map or group layer
      vectorTileParent.remove(vectorTileLayer)
      // And remove the vectorTileLayer from the adapter's internal state
      delete this._mapVisibilityLayers[datasetId]
      delete this._mapOpacityLayers[datasetId]
    }

    // If the group layer has no more sublayers, we need to also remove the group layer from the map
    if (groupLayer?.layers.length === 0) {
      this._map.remove(groupLayer)
      delete this._groupLayers[esriGroupId]
    }
  }

  _applyRegistryDatasetVisibility (registryDataset) {
    // if this is a sublayer, we need to apply the visibility to the vectorTileLayers style sheet
    // if this is a top level dataset, we need to apply the visibility to the vectorTileLayer/ groupLayer itself
    const { id, isSublayer, visible, parentId } = registryDataset
    const vectorTileLayer = this._mapVisibilityLayers[isSublayer ? parentId : id]
    if (!vectorTileLayer) {
      return
    }

    if (isSublayer) {
      this._applyStyleLayerVisibility(registryDataset, vectorTileLayer)
      // Don't apply the visibility change to the parent, since the parent may have other sublayers that are visible
      return
    }
    if (visible) {
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
    const vectorTileLayer = this._mapOpacityLayers[datasetId]
    const registryDataset = datasetRegistry.getDataset(datasetId)
    if (vectorTileLayer && registryDataset) {
      vectorTileLayer.opacity = registryDataset.opacity
    }
  }

  async applyGlobalOpacity () {
    Object.entries(this._mapOpacityLayers).forEach(([datasetId, vectorTileLayer]) => {
      const registryDataset = datasetRegistry.getDataset(datasetId)
      if (registryDataset) {
        vectorTileLayer.opacity = registryDataset.opacity
      }
    })
  }

  _applyStyleLayerVisibility (registryDataset, vectorTileLayer) {
    const { esriStyleLayerId } = registryDataset
    if (!esriStyleLayerId || !vectorTileLayer) {
      return
    }
    vectorTileLayer.setStyleLayerVisibility(esriStyleLayerId, registryDataset.visibility)
  }

  _applyStyleLayerPaintProperties (registryDataset, vectorTileLayer) {
    const { esriStyleLayerId, useServerStyle } = registryDataset
    if (useServerStyle || !esriStyleLayerId || !vectorTileLayer) {
      return
    }
    const layerPaintProperties = vectorTileLayer.getPaintProperties(esriStyleLayerId)
    if (layerPaintProperties) {
      registryDataset.applyLayerPaintProperties(layerPaintProperties)
      vectorTileLayer.setPaintProperties(esriStyleLayerId, registryDataset.applyLayerPaintProperties(layerPaintProperties))
    }
  }

  async onMapStyleChange () {
    datasetRegistry.forEach(registryDataset => {
      const { id, isSublayer, parent } = registryDataset

      // mapLayer could be a VectorTileLayer or a FeatureLayer, depending on the dataset type
      const mapLayer = this._mapVisibilityLayers[isSublayer ? parent.id : id]
      if (registryDataset.type === 'FeatureService') {
        // FeatureLayers don't have style layers, so we don't need to apply style layer visibility or paint properties
        mapLayer.renderer = registryDataset.renderer
      } else {
        this._applyStyleLayerVisibility(registryDataset, mapLayer)
        this._applyStyleLayerPaintProperties(registryDataset, mapLayer)
      }
    })
    // TODO - handle dynamic sources
  }

  // onMapSizeChange is not applicable to the esriLayerAdapter
  async onMapSizeChange () {}

  // Remaining methods are still todo
  async applyFeatureFilter (...args) {
    console.log('TODO: applyFeatureFilter', args)
  }

  async setData (...args) {
    console.log('TODO: setData', args)
  }

  async applyStyle (...args) {
    console.log('TODO: applyStyle', args)
  }
}
