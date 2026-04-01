import { applyExclusionFilter } from '../../utils/filters.js'
import { getSourceId, getLayerIds, getSublayerLayerIds, getAllLayerIds } from './layerIds.js'
import { addDatasetLayers, addSublayerLayers } from './layerBuilders.js'
import { registerPatterns } from './patternRegistry.js'
import { getSymbolConfigs } from './symbolImages.js'

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
 * `mapProvider.registerSymbols()`, keeping this adapter free of provider internals.
 */
export default class MaplibreLayerAdapter {
  /**
   * @param {Object} mapProvider - Map provider instance (e.g. MapLibreProvider)
   * @param {Object} symbolRegistry
   */
  constructor (mapProvider, symbolRegistry) {
    this._mapProvider = mapProvider
    this._map = mapProvider.map
    this._symbolRegistry = symbolRegistry
    // datasetId → sourceId, used by setData to update the correct source
    this._datasetSourceMap = new Map()
    // Tracks all active symbol-type layer IDs so non-symbol layers can be kept below them
    this._symbolLayerIds = new Set()
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Initialise all datasets: register patterns, add layers, then wait for idle.
   * @param {Object[]} datasets
   * @param {string} mapStyleId
   * @returns {Promise<void>} Resolves once the map has processed all layers.
   */
  async init (datasets, mapStyleId) {
    await Promise.all([
      registerPatterns(this._map, datasets, mapStyleId),
      this._mapProvider.registerSymbols(getSymbolConfigs(datasets), mapStyleId, this._symbolRegistry)
    ])
    this._symbolLayerIds.clear()
    datasets.forEach(dataset => this._addLayers(dataset, mapStyleId))
    await new Promise(resolve => this._map.once('idle', resolve))
  }

  /**
   * Remove all layers and sources for the given datasets.
   * @param {Object[]} datasets
   */
  destroy (datasets) {
    const removedSourceIds = new Set()
    datasets.forEach(dataset => {
      const sourceId = getSourceId(dataset)
      this._getLayersUsingSource(sourceId).forEach(layerId => {
        if (this._map.getLayer(layerId)) {
          this._map.removeLayer(layerId)
        }
      })
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
   * @param {Object[]} datasets
   * @param {string} newStyleId
   * @param {Object} hiddenFeatures - pluginState.hiddenFeatures
   * @param {Map} dynamicSources - datasetId → dynamic source instance
   * @returns {Promise<void>}
   */
  async onStyleChange (datasets, newStyleId, hiddenFeatures, dynamicSources) {
    // MapLibre wipes all sources/layers on style change — must wait for idle first
    await new Promise(resolve => this._map.once('idle', resolve))

    await Promise.all([
      registerPatterns(this._map, datasets, newStyleId),
      this._mapProvider.registerSymbols(getSymbolConfigs(datasets), newStyleId, this._symbolRegistry)
    ])
    this._symbolLayerIds.clear()
    datasets.forEach(dataset => this._addLayers(dataset, newStyleId))

    // Re-push cached data for dynamic sources
    dynamicSources.forEach(source => source.reapply())

    // Reapply hidden feature filters
    Object.entries(hiddenFeatures).forEach(([datasetId, { idProperty, ids }]) => {
      const dataset = datasets.find(d => d.id === datasetId)
      if (!dataset) {
        return
      }
      this._applyFeatureFilter(dataset, idProperty, ids)
    })
  }

  // ─── Dataset operations ─────────────────────────────────────────────────────

  /**
   * Add a single dataset's source and layers to the map.
   * @param {Object} dataset
   * @param {string} mapStyleId
   */
  addDataset (dataset, mapStyleId) {
    this._addLayers(dataset, mapStyleId)
  }

  /**
   * Remove a dataset's layers and source from the map.
   * Shared sources (same tiles URL or geojson URL used by multiple datasets) are
   * only removed when no other remaining dataset references them.
   * @param {Object} dataset
   * @param {Object[]} allDatasets - Full current dataset list, for shared-source check.
   */
  removeDataset (dataset, allDatasets) {
    const sourceId = getSourceId(dataset)

    getAllLayerIds(dataset).forEach(layerId => {
      if (this._map.getLayer(layerId)) {
        this._map.removeLayer(layerId)
      }
      this._symbolLayerIds.delete(layerId)
    })

    const sourceIsShared = allDatasets.some(d => d.id !== dataset.id && getSourceId(d) === sourceId)

    if (!sourceIsShared && this._map.getSource(sourceId)) {
      this._map.removeSource(sourceId)
    }

    this._datasetSourceMap.delete(dataset.id)
  }

  /**
   * Make a dataset's layers visible.
   * @param {string} datasetId
   */
  showDataset (datasetId) {
    this._setDatasetVisibility(datasetId, 'visible')
  }

  /**
   * Hide a dataset's layers.
   * @param {string} datasetId
   */
  hideDataset (datasetId) {
    this._setDatasetVisibility(datasetId, 'none')
  }

  /**
   * Make a single sublayer's layers visible.
   * @param {string} datasetId
   * @param {string} sublayerId
   */
  showSublayer (datasetId, sublayerId) {
    const { fillLayerId, strokeLayerId, symbolLayerId } = getSublayerLayerIds(datasetId, sublayerId)
    ;[fillLayerId, strokeLayerId, symbolLayerId].forEach(layerId => {
      if (this._map.getLayer(layerId)) {
        this._map.setLayoutProperty(layerId, 'visibility', 'visible')
      }
    })
  }

  /**
   * Hide a single sublayer's layers.
   * @param {string} datasetId
   * @param {string} sublayerId
   */
  hideSublayer (datasetId, sublayerId) {
    const { fillLayerId, strokeLayerId, symbolLayerId } = getSublayerLayerIds(datasetId, sublayerId)
    ;[fillLayerId, strokeLayerId, symbolLayerId].forEach(layerId => {
      if (this._map.getLayer(layerId)) {
        this._map.setLayoutProperty(layerId, 'visibility', 'none')
      }
    })
  }

  // ─── Feature operations ─────────────────────────────────────────────────────

  /**
   * Show previously hidden features by updating the layer exclusion filter.
   * @param {Object} dataset
   * @param {string} idProperty
   * @param {Array} remainingHiddenIds - IDs that should remain hidden after this call.
   */
  showFeatures (dataset, idProperty, remainingHiddenIds) {
    this._applyFeatureFilter(dataset, idProperty, remainingHiddenIds)
  }

  /**
   * Hide features by updating the layer exclusion filter.
   * @param {Object} dataset
   * @param {string} idProperty
   * @param {Array} allHiddenIds - Full set of IDs to hide (existing + new).
   */
  hideFeatures (dataset, idProperty, allHiddenIds) {
    this._applyFeatureFilter(dataset, idProperty, allHiddenIds)
  }

  /**
   * Update a dataset's style and re-render all its layers.
   * @param {Object} dataset - Updated dataset (style changes already merged in)
   * @param {string} mapStyleId
   * @returns {Promise<void>}
   */
  async setStyle (dataset, mapStyleId) {
    getAllLayerIds(dataset).forEach(layerId => {
      if (this._map.getLayer(layerId)) {
        this._map.removeLayer(layerId)
      }
      this._symbolLayerIds.delete(layerId)
    })
    await Promise.all([
      registerPatterns(this._map, [dataset], mapStyleId),
      this._mapProvider.registerSymbols(getSymbolConfigs([dataset]), mapStyleId, this._symbolRegistry)
    ])
    this._addLayers(dataset, mapStyleId)
  }

  /**
   * Update a single sublayer's style and re-render its layers.
   * @param {Object} dataset - Updated dataset (sublayer style changes already merged in)
   * @param {string} sublayerId
   * @param {string} mapStyleId
   * @returns {Promise<void>}
   */
  async setSublayerStyle (dataset, sublayerId, mapStyleId) {
    const { fillLayerId, strokeLayerId, symbolLayerId } = getSublayerLayerIds(dataset.id, sublayerId)
    ;[fillLayerId, strokeLayerId, symbolLayerId].forEach(layerId => {
      if (this._map.getLayer(layerId)) {
        this._map.removeLayer(layerId)
      }
      this._symbolLayerIds.delete(layerId)
    })
    const sublayer = dataset.sublayers?.find(s => s.id === sublayerId)
    if (!sublayer) {
      return
    }
    await Promise.all([
      registerPatterns(this._map, [dataset], mapStyleId),
      this._mapProvider.registerSymbols(getSymbolConfigs([dataset]), mapStyleId, this._symbolRegistry)
    ])
    const sourceId = this._datasetSourceMap.get(dataset.id)
    const sourceLayer = dataset.tiles?.length ? dataset.sourceLayer : undefined
    addSublayerLayers(this._map, dataset, sublayer, sourceId, sourceLayer, mapStyleId, this._symbolRegistry)
    this._maintainSymbolOrdering(dataset)
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
   * Set opacity for a single sublayer's fill and stroke layers.
   * Uses setPaintProperty directly — safe to call on every slider tick.
   * @param {string} datasetId
   * @param {string} sublayerId
   * @param {number} opacity
   */
  setSublayerOpacity (datasetId, sublayerId, opacity) {
    const { fillLayerId, strokeLayerId } = getSublayerLayerIds(datasetId, sublayerId)
    this._setPaintOpacity(fillLayerId, opacity)
    this._setPaintOpacity(strokeLayerId, opacity)
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

  _addLayers (dataset, mapStyleId) {
    const sourceId = addDatasetLayers(this._map, dataset, mapStyleId, this._symbolRegistry)
    this._datasetSourceMap.set(dataset.id, sourceId)
    this._maintainSymbolOrdering(dataset)
  }

  _getFirstSymbolLayerId () {
    const style = this._map.getStyle()
    if (!style?.layers) {
      return null
    }
    const layer = style.layers.find(l => this._symbolLayerIds.has(l.id))
    return layer?.id ?? null
  }

  _maintainSymbolOrdering (dataset) {
    const layerIds = getAllLayerIds(dataset).filter(id => id && this._map.getLayer(id))
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

  _setDatasetVisibility (datasetId, visibility) {
    const style = this._map.getStyle()
    if (!style?.layers) {
      return
    }
    // Covers base fill layer (datasetId) and all suffixed layers
    // (-stroke, -${sublayerId}, -${sublayerId}-stroke) without needing the dataset object.
    style.layers
      .filter(layer =>
        layer.id === datasetId ||
        layer.id.startsWith(`${datasetId}-`)
      )
      .forEach(layer => this._map.setLayoutProperty(layer.id, 'visibility', visibility))
  }

  _applyFeatureFilter (dataset, idProperty, excludeIds) {
    if (dataset.sublayers?.length) {
      dataset.sublayers.forEach(sublayer => {
        const { fillLayerId: subFillId, strokeLayerId: subStrokeId } = getSublayerLayerIds(dataset.id, sublayer.id)
        const sublayerFilter = dataset.filter && sublayer.filter
          ? ['all', dataset.filter, sublayer.filter]
          : (sublayer.filter || dataset.filter || null)
        applyExclusionFilter(this._map, subFillId, sublayerFilter, idProperty, excludeIds)
        applyExclusionFilter(this._map, subStrokeId, sublayerFilter, idProperty, excludeIds)
      })
      return
    }
    const { fillLayerId, strokeLayerId, symbolLayerId } = getLayerIds(dataset)
    const originalFilter = dataset.filter || null
    const layerIds = [fillLayerId, strokeLayerId, symbolLayerId].filter(Boolean)
    layerIds.forEach(layerId => {
      applyExclusionFilter(this._map, layerId, originalFilter, idProperty, excludeIds)
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
