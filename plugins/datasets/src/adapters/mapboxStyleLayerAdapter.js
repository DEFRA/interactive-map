import { LayerAdapter } from './layerAdapter.js'
import { datasetRegistry } from '../registry/datasetRegistry.js'

/**
 * Shared orchestration for adapters whose registry Dataset extends MapboxStyleDataset
 * (MapLibre, OpenLayers) — both fan a dataset out to layers via getLayersWith*, so
 * addDataset/applyDatasetOpacity/applyGlobalOpacity/applyDatasetVisibility/
 * applyGlobalVisibility are identical here. Esri has no such fan-out (one native layer per
 * dataset) and extends LayerAdapter directly instead.
 *
 * Concrete subclasses implement: _registerPatternsAndSymbols(registryDataset),
 * _addLayers(registryDataset), _setLayerOpacity(layerId, opacity) and
 * _setLayerVisibility(layerId, visibility).
 *
 * removeDataset/applyFeatureFilter/applyStyle/setData stay adapter-specific — they differ too
 * much (e.g. OpenLayers has no per-layer setFilter, so it rebuilds the whole style instead).
 */
export class MapboxStyleLayerAdapter extends LayerAdapter {
  constructor (mapProvider, symbolRegistry, patternRegistry) {
    super()
    this._mapProvider = mapProvider
    this._map = mapProvider.map
    this._symbolRegistry = symbolRegistry
    this._patternRegistry = patternRegistry
  }

  // Live — reflects the map's current pixelRatio, which can change on resize.
  get _pixelRatio () {
    return this._map.getPixelRatio()
  }

  async addDataset (datasetId) {
    const registryDataset = datasetRegistry.getDataset(datasetId)
    if (!registryDataset) {
      return
    }
    await this._registerPatternsAndSymbols(registryDataset)
    this._addLayers(registryDataset)
  }

  applyDatasetOpacity (datasetId) {
    const registryDataset = datasetRegistry.getDataset(datasetId)
    if (registryDataset) {
      this._applyRegistryDatasetOpacity(registryDataset)
    }
  }

  _applyRegistryDatasetOpacity (registryDataset) {
    registryDataset.getLayersWithOpacity().forEach(({ layerIds, opacity }) => {
      layerIds.forEach(layerId => this._setLayerOpacity(layerId, opacity))
    })
  }

  applyGlobalOpacity () {
    datasetRegistry.forEachDataset(registryDataset => this._applyRegistryDatasetOpacity(registryDataset))
  }

  applyDatasetVisibility (datasetId) {
    const registryDataset = datasetRegistry.getDataset(datasetId)
    if (registryDataset) {
      this._applyRegistryDatasetVisibility(registryDataset)
    }
  }

  _applyRegistryDatasetVisibility (registryDataset) {
    registryDataset.getLayersWithVisibility().forEach(({ layerIds, visibility }) => {
      layerIds.forEach(layerId => this._setLayerVisibility(layerId, visibility))
    })
  }

  applyGlobalVisibility () {
    datasetRegistry.forEachDataset(registryDataset => this._applyRegistryDatasetVisibility(registryDataset))
  }
}
