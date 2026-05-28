import { addDatasetLayers } from './layerBuilders.js'
import { MapLibreDataset } from './datasets/mapLibreDataset.js'
import { datasetRegistry } from '../../registry/datasetRegistry.js'

/**
 * MapLibre GL JS implementation of the LayerAdapter interface for the datasets plugin.
 *
 * Owns all map-framework-specific concerns:
 * - Source and layer creation (delegated to layerBuilders)
 * - Pattern image registration (delegated to patternRegistry)
 * - Visibility toggling, feature filtering, style changes
 * - Style-change recovery (re-adding layers after basemap swap)
 *
 * Symbol image rasterisation is delegated to the map provider via
 * `mapProvider.addSymbolsToMap()`, keeping this adapter free of provider internals.
 */
export default class MaplibreLayerAdapter {
  /**
   * @param {Object} mapProvider - Map provider instance (e.g. MapLibreProvider)
   * @param {Object} symbolRegistry
   * @param {Object} patternRegistry
   */
  constructor (mapProvider, symbolRegistry, patternRegistry) {
    this._mapProvider = mapProvider
    this._map = mapProvider.map
    this._symbolRegistry = symbolRegistry
    this._patternRegistry = patternRegistry
    // datasetId → sourceId, used by setData to update the correct source
    this._datasetSourceMap = new Map()
    window._datasetSourceMap = this._datasetSourceMap // Expose for debugging
    // Tracks all active symbol-type layer IDs so non-symbol layers can be kept below them
    this._symbolLayerIds = new Set()
  }

  static createDataset (datasetDefinition) {
    return new MapLibreDataset(datasetDefinition)
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Initialise all datasets: register patterns, add layers, then wait for idle.
   * @param {Object} mapStyle
   * @returns {Promise<void>} Resolves once the map has processed all layers.
   */
  async init (mapStyle) {
    const { patternConfigs, symbolConfigs } = datasetRegistry.getPatternAndSymbolConfigs()
    await this.addPatternsAndSymbolsToMap(patternConfigs, symbolConfigs, mapStyle)

    this._symbolLayerIds.clear()
    datasetRegistry.forEachDataset(registryDataset => this._addLayers(registryDataset, mapStyle))
    await new Promise(resolve => this._map.once('idle', resolve))
  }

  removeLayer (layerId) {
    if (this._map.getLayer(layerId)) {
      this._map.removeLayer(layerId)
    }
    this._symbolLayerIds.delete(layerId)
  }

  async addPatternsAndSymbolsToMap (patterns, symbols, mapStyle) {
    const mapStyleId = mapStyle.id
    return Promise.all([
      this._mapProvider.addPatternsToMap(patterns, mapStyleId, this._patternRegistry),
      this._mapProvider.addSymbolsToMap(symbols, mapStyle, this._symbolRegistry)
    ])
  }

  /**
   * Remove all layers and sources for the given datasets.
   */
  destroy () {
    const removedSourceIds = new Set()
    datasetRegistry.forEachDataset(registryDataset => {
      const sourceId = registryDataset.sourceId
      this._getLayersUsingSource(sourceId).forEach(layerId => this.removeLayer(layerId))
      if (!removedSourceIds.has(sourceId) && this._map.getSource(sourceId)) {
        this._map.removeSource(sourceId)
        removedSourceIds.add(sourceId)
      }
    })
    this._datasetSourceMap.clear()
  }

  /**
   * Re-register patterns and re-add all layers after a basemap style change,
   * then reapply cached dynamic source data and hidden-feature filters.
   * @param {Object} newMapStyle
   * @param {Map} dynamicSources - datasetId → dynamic source instance
   * @returns {Promise<void>}
   */
  async onMapStyleChange (newMapStyle, dynamicSources) {
    // MapLibre wipes all sources/layers on style change — must wait for idle first
    await new Promise(resolve => this._map.once('idle', resolve))

    const { patternConfigs, symbolConfigs } = datasetRegistry.getPatternAndSymbolConfigs()
    await this.addPatternsAndSymbolsToMap(patternConfigs, symbolConfigs, newMapStyle)
    this._symbolLayerIds.clear()

    datasetRegistry.forEachDataset(registryDataset => {
      this._addLayers(registryDataset, newMapStyle)
      this._applyFeatureFilter(registryDataset)
    })

    // TODO: check dynamicSources still work
    // Re-push cached data for dynamic sources
    dynamicSources.forEach(source => source.reapply())
  }

  /**
   * Re-register symbols at the new pixel ratio and update icon-image on all symbol layers.
   * Called when the map size changes so symbols are rasterised at the correct resolution.
   * @param {Object} mapStyle
   * @returns {Promise<void>}
   */
  async onSizeChange (mapStyle) {
    const { patternConfigs, symbolConfigs } = datasetRegistry.getPatternAndSymbolConfigs()
    await this.addPatternsAndSymbolsToMap(patternConfigs, symbolConfigs, mapStyle)

    datasetRegistry.forEach(registryDataset => {
      const { fillLayerId, symbolLayerId } = registryDataset
      if (symbolLayerId && this._symbolLayerIds.has(symbolLayerId) && this._map.getLayer(symbolLayerId)) {
        const imageId = this._symbolRegistry.getSymbolImageId(registryDataset.style, mapStyle, false, this._pixelRatio)
        if (imageId) {
          this._map.setLayoutProperty(symbolLayerId, 'icon-image', imageId)
        }
      } else if (fillLayerId && this._map.getLayer(fillLayerId)) {
        const imageId = this._patternRegistry.getPatternImageId(registryDataset.style, mapStyle.id, this._pixelRatio)
        if (imageId) {
          this._map.setPaintProperty(fillLayerId, 'fill-pattern', imageId)
        }
      }
    })
  }

  // ─── Dataset operations ─────────────────────────────────────────────────────

  /**
   * Add a single dataset's source and layers to the map.
   * @param {string} datasetId
   * @param {Object} mapStyle
   */
  async addDataset (datasetId, mapStyle) {
    const registryDataset = datasetRegistry.getDataset(datasetId)
    await this.addPatternsAndSymbolsToMap(registryDataset.patternConfigs, registryDataset.symbolConfigs, mapStyle)
    this._addLayers(registryDataset, mapStyle)
  }

  /**
   * Remove a dataset's layers and source from the map.
   * Shared sources (same tiles URL or geojson URL used by multiple datasets) are
   * only removed when no other remaining dataset references them.
   * @param {string} datasetId
   */
  removeDataset (datasetId) {
    const registryDataset = datasetRegistry.getDataset(datasetId)
    if (!registryDataset) {
      return
    }
    const { sourceId, layerIds } = registryDataset
    // Remove all layers for this dataset (including sublayers, which share the same source)
    layerIds.forEach(layerId => this.removeLayer(layerId))

    // Remove source if no other dataset is using it
    const sourceIsShared = datasetRegistry.topLevelDatasets()
      .filter(registryDataset => registryDataset.id !== datasetId && registryDataset.sourceId === sourceId)
      .length > 0

    if (!sourceIsShared && this._map.getSource(sourceId)) {
      this._map.removeSource(sourceId)
    }

    this._datasetSourceMap.delete(datasetId)
  }

  // ─── Feature operations ─────────────────────────────────────────────────────

  /**
   * Show/Hide features by updating the layer exclusion filter.
   * @param {string} datasetId
   */
  applyFeatureFilter (datasetId) {
    const registryDataset = datasetRegistry.getDataset(datasetId)
    if (!registryDataset) {
      return
    }

    this._applyFeatureFilter(registryDataset)
  }

  /**
   * Update a dataset's style and re-render all its layers.
   * @param {string} datasetId - Updated dataset (style changes already merged in)
   * @param {Object} mapStyle
   * @returns {Promise<void>}
   */
  async applyStyle (datasetId, mapStyle) {
    const registryDataset = datasetRegistry.getDataset(datasetId)
    registryDataset.layerIds.forEach(layerId => this.removeLayer(layerId))
    await this.addPatternsAndSymbolsToMap(registryDataset.patternConfigs, registryDataset.symbolConfigs, mapStyle)
    this._addLayers(registryDataset, mapStyle)
  }

  /**
   * Set opacity for all layers belonging to a dataset.
   * Uses setPaintProperty directly — safe to call on every slider tick.
   * @param {string} datasetId
   * @param {number} opacity
   */
  setOpacity (datasetId, opacity) {
    const style = this._map.getStyle()
    if (!style?.layers) {
      return
    }
    style.layers
      .filter(layer => layer.id === datasetId || layer.id.startsWith(`${datasetId}-`))
      .forEach(layer => this._setPaintOpacity(layer.id, opacity))
  }

  /**
   * Update the GeoJSON data for a dataset's source.
   * @param {string} datasetId
   * @param {Object} geojson - GeoJSON FeatureCollection
   */
  setData (datasetId, geojson) {
    const sourceId = this._datasetSourceMap.get(datasetId)
    if (!sourceId) {
      return
    }
    const source = this._map.getSource(sourceId)
    if (source && typeof source.setData === 'function') {
      source.setData(geojson)
    }
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  get _pixelRatio () {
    return this._mapProvider.map.getPixelRatio()
  }

  _addLayers (registryDataset, mapStyle) {
    const sourceId = addDatasetLayers(this._map, registryDataset, mapStyle, this._symbolRegistry, this._patternRegistry, this._pixelRatio)
    this._datasetSourceMap.set(registryDataset.id, sourceId)
    this._maintainSymbolOrdering(registryDataset)
  }

  _getFirstSymbolLayerId () {
    const style = this._map.getStyle()
    if (!style?.layers) {
      return null
    }
    const layer = style.layers.find(l => this._symbolLayerIds.has(l.id))
    return layer?.id ?? null
  }

  _maintainSymbolOrdering (registryDataset) {
    registryDataset = registryDataset.isSublayer ? registryDataset.parent : registryDataset
    const layerIds = registryDataset.layerIds.filter(id => id && this._map.getLayer(id))
    layerIds.forEach(id => {
      if (this._map.getLayer(id)?.type === 'symbol') {
        this._symbolLayerIds.add(id)
      } else {
        this._symbolLayerIds.delete(id)
      }
    })
    const firstSymbolId = this._getFirstSymbolLayerId()
    if (!firstSymbolId) {
      return
    }
    layerIds.forEach(id => {
      if (!this._symbolLayerIds.has(id)) {
        this._map.moveLayer(id, firstSymbolId)
      }
    })
  }

  applyDatasetVisibility (datasetId) {
    const registryDataset = datasetRegistry.getDataset(datasetId)
    const style = this._map.getStyle()
    if (!style?.layers) {
      return
    }
    // Covers base fill layer (datasetId) and all suffixed layers
    // (-stroke, -${sublayerId}, -${sublayerId}-stroke) without needing the dataset object.
    if (registryDataset.hasSublayers) {
      const { sublayerIds } = registryDataset
      sublayerIds.forEach(sublayerId => { this.applyDatasetVisibility(sublayerId) })
    } else {
      const { visibility } = registryDataset
      const datasetId = registryDataset.id
      style.layers.filter(layer =>
        layer.id === datasetId || layer.id.startsWith(`${datasetId}-`)
      ).forEach(layer => {
        this._map.setLayoutProperty(layer.id, 'visibility', visibility)
      })
    }
  }

  _applyFeatureFilter (registryDataset) {
    const { layersWithFilters } = registryDataset
    layersWithFilters.forEach(({ layerIds, filter }) => {
      layerIds.forEach(layerId => {
        if (this._map.getLayer(layerId)) {
          this._map.setFilter(layerId, filter)
        }
      })
    })
  }

  _setPaintOpacity (layerId, opacity) {
    const layer = this._map.getLayer(layerId)
    if (!layer) {
      return
    }
    const opacityProps = { line: 'line-opacity', symbol: 'icon-opacity' }
    const prop = opacityProps[layer.type] || 'fill-opacity'
    this._map.setPaintProperty(layerId, prop, opacity)
  }

  _getLayersUsingSource (sourceId) {
    const style = this._map.getStyle()
    if (!style?.layers) {
      return []
    }
    return style.layers
      .filter(layer => layer.source === sourceId)
      .map(layer => layer.id)
  }
}
