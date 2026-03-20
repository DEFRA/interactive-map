import { getValueForStyle } from '../../../../../../src/utils/getValueForStyle.js'
import { hasPattern, getPatternInnerContent, getPatternImageId, rasterisePattern } from '../../styles/patterns.js'
import { applyExclusionFilter } from '../../utils/filters.js'

const isDynamicSource = (dataset) =>
  typeof dataset.geojson === 'string' &&
  !!dataset.idProperty &&
  typeof dataset.transformRequest === 'function'

const hashString = (str) => {
  const HASH_BASE = 36
  let hash = 0
  for (const ch of str) {
    hash = ((hash << 5) - hash) + ch.codePointAt(0)
    hash = hash & hash
  }
  return Math.abs(hash).toString(HASH_BASE)
}

/**
 * MapLibre GL JS implementation of the LayerAdapter interface for the datasets plugin.
 *
 * Owns all map-framework-specific concerns:
 * - Source and layer creation (fill + stroke layers per dataset)
 * - Pattern image registration (rasterisation + map.addImage)
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
    await this._registerPatterns(datasets, mapStyleId)
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
      const sourceId = this._getSourceId(dataset)
      this._getLayersUsingSource(sourceId).forEach(layerId => {
        if (this._map.getLayer(layerId)) this._map.removeLayer(layerId)
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

    await this._registerPatterns(datasets, newStyleId)
    datasets.forEach(dataset => this._addLayers(dataset, newStyleId))

    // Re-push cached data for dynamic sources
    dynamicSources.forEach(source => source.reapply())

    // Reapply hidden feature filters
    Object.entries(hiddenFeatures).forEach(([datasetId, { idProperty, ids }]) => {
      const dataset = datasets.find(d => d.id === datasetId)
      if (!dataset) return
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
    const { fillLayerId, strokeLayerId } = this._getLayerIds(dataset)
    const sourceId = this._getSourceId(dataset)

    ;[strokeLayerId, fillLayerId].forEach(layerId => {
      if (layerId && this._map.getLayer(layerId)) {
        this._map.removeLayer(layerId)
      }
    })

    const sourceIsShared = allDatasets.some(
      d => d.id !== dataset.id && this._getSourceId(d) === sourceId
    )
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

  // ─── New API stubs ───────────────────────────────────────────────────────────

  /**
   * Update a dataset's style properties (fill, stroke, opacity, pattern etc).
   * @param {Object} dataset
   * @param {string} mapStyleId
   * @param {Object} styleChanges
   * @stub
   */
  setStyle (dataset, mapStyleId, styleChanges) {
    // TODO: implement — map.setPaintProperty for fill-color, line-color, opacity etc
  }

  /**
   * Update the GeoJSON data for a dataset's source.
   * @param {string} datasetId
   * @param {Object} geojson - GeoJSON FeatureCollection
   */
  setData (datasetId, geojson) {
    const sourceId = this._datasetSourceMap.get(datasetId)
    if (!sourceId) return
    const source = this._map.getSource(sourceId)
    if (source && typeof source.setData === 'function') {
      source.setData(geojson)
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  _getSourceId (dataset) {
    if (dataset.tiles) {
      const tilesKey = Array.isArray(dataset.tiles) ? dataset.tiles.join(',') : dataset.tiles
      return `tiles-${hashString(tilesKey)}`
    }
    if (dataset.geojson) {
      if (isDynamicSource(dataset)) return `geojson-dynamic-${dataset.id}`
      if (typeof dataset.geojson === 'string') return `geojson-${hashString(dataset.geojson)}`
      return `geojson-${dataset.id}`
    }
    return `source-${dataset.id}`
  }

  _getLayerIds (dataset) {
    const hasFill = !!dataset.fill || hasPattern(dataset)
    const hasStroke = !!dataset.stroke
    const fillLayerId = hasFill ? dataset.id : null
    const strokeLayerId = hasStroke ? (hasFill ? `${dataset.id}-stroke` : dataset.id) : null
    return { fillLayerId, strokeLayerId }
  }

  _getLayersUsingSource (sourceId) {
    const style = this._map.getStyle()
    if (!style?.layers) return []
    return style.layers
      .filter(layer => layer.source === sourceId)
      .map(layer => layer.id)
  }

  _setDatasetVisibility (datasetId, visibility) {
    const fillLayerId = datasetId
    const strokeLayerId = `${datasetId}-stroke`
    if (this._map.getLayer(fillLayerId)) {
      this._map.setLayoutProperty(fillLayerId, 'visibility', visibility)
    }
    if (this._map.getLayer(strokeLayerId)) {
      this._map.setLayoutProperty(strokeLayerId, 'visibility', visibility)
    }
  }

  _applyFeatureFilter (dataset, idProperty, excludeIds) {
    const { fillLayerId, strokeLayerId } = this._getLayerIds(dataset)
    const originalFilter = dataset.filter || null
    if (fillLayerId) {
      applyExclusionFilter(this._map, fillLayerId, originalFilter, idProperty, excludeIds)
    }
    if (strokeLayerId) {
      applyExclusionFilter(this._map, strokeLayerId, originalFilter, idProperty, excludeIds)
    }
  }

  async _registerPatterns (datasets, mapStyleId) {
    const patternDatasets = datasets.filter(hasPattern)
    if (!patternDatasets.length) return

    await Promise.all(patternDatasets.map(async (dataset) => {
      const imageId = getPatternImageId(dataset, mapStyleId)
      if (!imageId || this._map.hasImage(imageId)) return

      const result = await rasterisePattern(dataset, mapStyleId)
      if (result) {
        this._map.addImage(result.imageId, result.imageData, { pixelRatio: 2 })
      }
    }))
  }

  _addLayers (dataset, mapStyleId) {
    const sourceId = this._getSourceId(dataset)

    // Track datasetId → sourceId for setData()
    this._datasetSourceMap.set(dataset.id, sourceId)

    // ── Add source ────────────────────────────────────────────────────────────
    if (!this._map.getSource(sourceId)) {
      if (dataset.tiles) {
        this._map.addSource(sourceId, {
          type: 'vector',
          tiles: dataset.tiles,
          minzoom: dataset.minZoom || 0,
          maxzoom: dataset.maxZoom || 22
        })
      } else if (dataset.geojson) {
        const initialData = isDynamicSource(dataset)
          ? { type: 'FeatureCollection', features: [] }
          : dataset.geojson
        this._map.addSource(sourceId, { type: 'geojson', data: initialData })
      }
    }

    const { fillLayerId, strokeLayerId } = this._getLayerIds(dataset)
    const visibility = dataset.visibility === 'hidden' ? 'none' : 'visible'
    const sourceLayer = dataset.tiles?.length ? dataset.sourceLayer : undefined

    // ── Add fill layer ────────────────────────────────────────────────────────
    if (fillLayerId && !this._map.getLayer(fillLayerId)) {
      const patternImageId = hasPattern(dataset) ? getPatternImageId(dataset, mapStyleId) : null
      const fillPaint = patternImageId
        ? { 'fill-pattern': patternImageId, 'fill-opacity': dataset.opacity || 1 }
        : { 'fill-color': getValueForStyle(dataset.fill, mapStyleId), 'fill-opacity': dataset.opacity || 1 }

      this._map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        'source-layer': sourceLayer,
        layout: { visibility },
        paint: fillPaint,
        ...(dataset.filter ? { filter: dataset.filter } : {})
      })
    }

    // ── Add stroke layer ──────────────────────────────────────────────────────
    if (strokeLayerId && !this._map.getLayer(strokeLayerId)) {
      this._map.addLayer({
        id: strokeLayerId,
        type: 'line',
        source: sourceId,
        'source-layer': sourceLayer,
        layout: { visibility },
        paint: {
          'line-color': getValueForStyle(dataset.stroke, mapStyleId),
          'line-width': dataset.strokeWidth || 1,
          'line-opacity': dataset.opacity || 1,
          ...(dataset.strokeDashArray ? { 'line-dasharray': dataset.strokeDashArray } : {})
        },
        ...(dataset.filter ? { filter: dataset.filter } : {})
      })
    }
  }
}
