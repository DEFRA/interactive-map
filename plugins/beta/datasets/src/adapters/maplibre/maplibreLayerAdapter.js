import { applyExclusionFilter } from '../../utils/filters.js'
import { getSourceId, getLayerIds, getRuleLayerIds, getAllLayerIds } from './layerIds.js'
import { addDatasetLayers, addRuleLayers } from './layerBuilders.js'
import { registerPatterns } from './patternRegistry.js'

/**
 * MapLibre GL JS implementation of the LayerAdapter interface for the datasets plugin.
 *
 * Owns all map-framework-specific concerns:
 * - Source and layer creation (delegated to layerBuilders)
 * - Pattern image registration (delegated to patternRegistry)
 * - Visibility toggling, feature filtering, style changes
 * - Style-change recovery (re-adding layers after basemap swap)
 */
export default class MaplibreLayerAdapter {
  constructor (map) {
    this._map = map
    // datasetId → sourceId, used by setData to update the correct source
    this._datasetSourceMap = new Map()
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Initialise all datasets: register patterns, add layers, then wait for idle.
   * @param {Object[]} datasets
   * @param {string} mapStyleId
   * @returns {Promise<void>} Resolves once the map has processed all layers.
   */
  async init (datasets, mapStyleId) {
    await registerPatterns(this._map, datasets, mapStyleId)
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

    await registerPatterns(this._map, datasets, newStyleId)
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
   * Make a single featureStyleRule's layers visible.
   * @param {string} datasetId
   * @param {string} ruleId
   */
  showRule (datasetId, ruleId) {
    const { fillLayerId, strokeLayerId } = getRuleLayerIds(datasetId, ruleId)
    if (this._map.getLayer(fillLayerId)) {
      this._map.setLayoutProperty(fillLayerId, 'visibility', 'visible')
    }
    if (this._map.getLayer(strokeLayerId)) {
      this._map.setLayoutProperty(strokeLayerId, 'visibility', 'visible')
    }
  }

  /**
   * Hide a single featureStyleRule's layers.
   * @param {string} datasetId
   * @param {string} ruleId
   */
  hideRule (datasetId, ruleId) {
    const { fillLayerId, strokeLayerId } = getRuleLayerIds(datasetId, ruleId)
    if (this._map.getLayer(fillLayerId)) {
      this._map.setLayoutProperty(fillLayerId, 'visibility', 'none')
    }
    if (this._map.getLayer(strokeLayerId)) {
      this._map.setLayoutProperty(strokeLayerId, 'visibility', 'none')
    }
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
    })
    await registerPatterns(this._map, [dataset], mapStyleId)
    this._addLayers(dataset, mapStyleId)
  }

  /**
   * Update a single featureStyleRule's style and re-render its layers.
   * @param {Object} dataset - Updated dataset (rule style changes already merged in)
   * @param {string} ruleId
   * @param {string} mapStyleId
   * @returns {Promise<void>}
   */
  async setRuleStyle (dataset, ruleId, mapStyleId) {
    const { fillLayerId, strokeLayerId } = getRuleLayerIds(dataset.id, ruleId)
    if (this._map.getLayer(fillLayerId)) {
      this._map.removeLayer(fillLayerId)
    }
    if (this._map.getLayer(strokeLayerId)) {
      this._map.removeLayer(strokeLayerId)
    }
    const rule = dataset.featureStyleRules?.find(r => r.id === ruleId)
    if (!rule) {
      return
    }
    await registerPatterns(this._map, [dataset], mapStyleId)
    const sourceId = this._datasetSourceMap.get(dataset.id)
    const sourceLayer = dataset.tiles?.length ? dataset.sourceLayer : undefined
    addRuleLayers(this._map, dataset, rule, sourceId, sourceLayer, mapStyleId)
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
    const sourceId = addDatasetLayers(this._map, dataset, mapStyleId)
    this._datasetSourceMap.set(dataset.id, sourceId)
  }

  _setDatasetVisibility (datasetId, visibility) {
    const style = this._map.getStyle()
    if (!style?.layers) {
      return
    }
    // Covers base fill layer (datasetId) and all suffixed layers
    // (-stroke, -${ruleId}, -${ruleId}-stroke) without needing the dataset object.
    style.layers
      .filter(layer =>
        layer.id === datasetId ||
        layer.id.startsWith(`${datasetId}-`)
      )
      .forEach(layer => this._map.setLayoutProperty(layer.id, 'visibility', visibility))
  }

  _applyFeatureFilter (dataset, idProperty, excludeIds) {
    if (dataset.featureStyleRules?.length) {
      dataset.featureStyleRules.forEach(rule => {
        const { fillLayerId: ruleFillId, strokeLayerId: ruleStrokeId } = getRuleLayerIds(dataset.id, rule.id)
        const ruleFilter = dataset.filter && rule.filter
          ? ['all', dataset.filter, rule.filter]
          : (rule.filter || dataset.filter || null)
        applyExclusionFilter(this._map, ruleFillId, ruleFilter, idProperty, excludeIds)
        applyExclusionFilter(this._map, ruleStrokeId, ruleFilter, idProperty, excludeIds)
      })
      return
    }
    const { fillLayerId, strokeLayerId } = getLayerIds(dataset)
    const originalFilter = dataset.filter || null
    if (fillLayerId) {
      applyExclusionFilter(this._map, fillLayerId, originalFilter, idProperty, excludeIds)
    }
    if (strokeLayerId) {
      applyExclusionFilter(this._map, strokeLayerId, originalFilter, idProperty, excludeIds)
    }
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
