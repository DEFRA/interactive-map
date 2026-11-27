import { addDatasetLayers, isLngLatMap } from './layerBuilders.js'
import { MapLibreDataset } from './registry/mapLibreDataset.js'
import { MapboxStyleLayerAdapter } from '../mapboxStyleLayerAdapter.js'

// A dynamic source identifies a feature by its idProperty value, or its own id without one, as
// OpenLayers does. MapLibre's promoteId has no such fallback, and updateData needs every feature's
// id, so a feature without the value gets its own id copied into it.
const withPromotedId = (feature, idProperty) => feature.properties?.[idProperty] == null
  ? { ...feature, properties: { ...feature.properties, [idProperty]: feature.id } }
  : feature

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
export default class MaplibreLayerAdapter extends MapboxStyleLayerAdapter {
  /**
   * @param {Object} mapProvider - Map provider instance (e.g. MapLibreProvider)
   * @param {Object} symbolRegistry
   * @param {Object} patternRegistry
   * @param {Object} datasetRegistry - This plugin instance's dataset registry
   */
  constructor (mapProvider, symbolRegistry, patternRegistry, datasetRegistry) {
    super(mapProvider, symbolRegistry, patternRegistry, datasetRegistry)
    // datasetId → sourceId, used by setData to update the correct source
    this._datasetSourceMap = new Map()
    window._datasetSourceMap = this._datasetSourceMap // Expose for debugging
    // Tracks all active symbol-type layer IDs so non-symbol layers can be kept below them
    this._symbolLayerIds = new Set()
    // Each feature's lng/lat copy, on a map in another CRS. A dynamic source passes its whole
    // cache to setData on every update, with the same feature objects, so each is converted once.
    this._lngLatFeatures = new WeakMap()
  }

  createDataset (datasetDefinition, datasetRegistry) {
    return new MapLibreDataset(datasetDefinition, datasetRegistry)
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Initialise all datasets: register patterns, add layers, then wait for idle.
   * @returns {Promise<void>} Resolves once the map has processed all layers.
   */
  async init () {
    const { patternConfigs, symbolConfigs } = this._datasetRegistry.getPatternAndSymbolConfigs()
    await this.addPatternsAndSymbolsToMap(patternConfigs, symbolConfigs)

    this._symbolLayerIds.clear()
    this._datasetRegistry.forEachDataset(registryDataset => this._addLayers(registryDataset))
    await new Promise(resolve => this._map.once('idle', resolve))
  }

  removeLayer (layerId) {
    if (this._map.getLayer(layerId)) {
      this._map.removeLayer(layerId)
    }
    this._symbolLayerIds.delete(layerId)
  }

  async addPatternsAndSymbolsToMap (patterns, symbols) {
    const mapStyle = this._datasetRegistry.mapStyle
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
    this._datasetRegistry.forEachDataset(registryDataset => {
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
   * @returns {Promise<void>}
   */
  async onMapStyleChange () {
    // MapLibre wipes all sources/layers on style change — must wait for idle first
    await new Promise(resolve => this._map.once('idle', resolve))

    const { patternConfigs, symbolConfigs } = this._datasetRegistry.getPatternAndSymbolConfigs()
    await this.addPatternsAndSymbolsToMap(patternConfigs, symbolConfigs)
    this._symbolLayerIds.clear()

    this._datasetRegistry.forEachDataset(registryDataset => {
      this._addLayers(registryDataset)
      this._applyFeatureFilter(registryDataset)
    })

    // Re-push cached data for dynamic sources
    this.dynamicSources.forEach(source => source.reapply())
  }

  /**
   * Re-register symbols at the new pixel ratio and update icon-image on all symbol layers.
   * Called when the map size changes so symbols are rasterised at the correct resolution.
   * @returns {Promise<void>}
   */
  async onMapSizeChange () {
    const { mapStyle } = this._datasetRegistry
    const pixelRatio = this._pixelRatio
    const { patternConfigs, symbolConfigs } = this._datasetRegistry.getPatternAndSymbolConfigs()
    await this.addPatternsAndSymbolsToMap(patternConfigs, symbolConfigs)
    // A later size change has moved the map on to another ratio while these images were being
    // registered — its own call applies that ratio's images, which may not be registered yet
    if (this._pixelRatio !== pixelRatio) {
      return
    }

    this._datasetRegistry.forEach(registryDataset => {
      const { fillLayerId, symbolLayerId } = registryDataset
      if (symbolLayerId && this._symbolLayerIds.has(symbolLayerId) && this._map.getLayer(symbolLayerId)) {
        const imageId = this._symbolRegistry.getSymbolImageId(registryDataset.style, mapStyle, 'normal', pixelRatio)
        if (imageId) {
          this._map.setLayoutProperty(symbolLayerId, 'icon-image', imageId)
        }
        return
      }
      if (fillLayerId && this._map.getLayer(fillLayerId)) {
        const imageId = this._patternRegistry.getPatternImageId(registryDataset.style, mapStyle.id, pixelRatio)
        if (imageId) {
          this._map.setPaintProperty(fillLayerId, 'fill-pattern', imageId)
        }
      }
    })
  }

  // ─── Dataset operations ─────────────────────────────────────────────────────

  // addDataset is inherited from MapboxStyleLayerAdapter, which now guards an unknown
  // datasetId (previously this threw here, matching OpenLayersLayerAdapter's behaviour).
  _registerPatternsAndSymbols (registryDataset) {
    return this.addPatternsAndSymbolsToMap(registryDataset.patternConfigs, registryDataset.symbolConfigs)
  }

  /**
   * Remove a dataset's layers and source from the map.
   * Shared sources (same tiles URL or geojson URL used by multiple datasets) are
   * only removed when no other remaining dataset references them.
   * @param {string} datasetId
   */
  removeDataset (datasetId) {
    const registryDataset = this._datasetRegistry.getDataset(datasetId)
    if (!registryDataset) {
      return
    }
    const { sourceId, layerIds } = registryDataset
    // Remove all layers for this dataset (including sublayers, which share the same source)
    layerIds.forEach(layerId => this.removeLayer(layerId))

    // Remove source if no other dataset is using it
    const sourceIsShared = this._datasetRegistry.topLevelDatasets()
      .some(dataset => dataset.id !== datasetId && dataset.sourceId === sourceId)

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
    const registryDataset = this._datasetRegistry.getDataset(datasetId)
    if (!registryDataset) {
      return
    }

    this._applyFeatureFilter(registryDataset)
  }

  /**
   * Update a dataset's style and re-render all its layers.
   * @param {string} datasetId - Updated dataset (style changes already merged in)
   * @returns {Promise<void>}
   */
  async applyStyle (datasetId) {
    const registryDataset = this._datasetRegistry.getDataset(datasetId)
    registryDataset.layerIds.forEach(layerId => this.removeLayer(layerId))
    await this._registerPatternsAndSymbols(registryDataset)
    this._addLayers(registryDataset)
  }

  // Opacity/visibility methods are inherited from MapboxStyleLayerAdapter.

  /**
   * Update the GeoJSON data for a dataset's source.
   * @param {string} datasetId
   * @param {Object} geojson - GeoJSON FeatureCollection in the map's CRS
   */
  setData (datasetId, geojson) {
    const source = this._getGeoJSONSource(datasetId)
    if (!source) {
      return
    }
    const idProperty = this._getDynamicIdProperty(datasetId)
    const lngLatGeoJSON = this._toLngLat(geojson)
    source.setData(idProperty && lngLatGeoJSON?.features
      ? { ...lngLatGeoJSON, features: lngLatGeoJSON.features.map(feature => withPromotedId(feature, idProperty)) }
      : lngLatGeoJSON)
  }

  /**
   * Add and remove features by id, without passing the rest of the dataset again.
   * @param {string} datasetId
   * @param {{ add: Object[], remove: Array }} changes - Features to add, and IDs of features to remove
   */
  updateData (datasetId, { add, remove }) {
    const source = this._getGeoJSONSource(datasetId)
    if (!source) {
      return
    }
    const idProperty = this._getDynamicIdProperty(datasetId)
    source.updateData({ add: add.map(feature => withPromotedId(this._featureToLngLat(feature), idProperty)), remove })
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  _toLngLat (geojson) {
    if (isLngLatMap(this._mapProvider)) {
      return geojson
    }
    if (geojson?.type !== 'FeatureCollection') {
      return this._mapProvider.geojsonToLngLat(geojson)
    }
    return { ...geojson, features: geojson.features.map(feature => this._featureToLngLat(feature)) }
  }

  // Converted once per feature: a dynamic source passes the same feature objects again
  _featureToLngLat (feature) {
    if (isLngLatMap(this._mapProvider)) {
      return feature
    }
    if (!this._lngLatFeatures.has(feature)) {
      this._lngLatFeatures.set(feature, this._mapProvider.geojsonToLngLat(feature))
    }
    return this._lngLatFeatures.get(feature)
  }

  _getDynamicIdProperty (datasetId) {
    return this._datasetRegistry.getDataset(datasetId)?.dynamicGeoJSON?.idProperty
  }

  _getGeoJSONSource (datasetId) {
    const sourceId = this._datasetSourceMap.get(datasetId)
    const source = sourceId && this._map.getSource(sourceId)
    return typeof source?.setData === 'function' ? source : null
  }

  _addLayers (registryDataset) {
    const { mapStyle } = this._datasetRegistry
    const sourceId = addDatasetLayers(this._mapProvider, registryDataset, mapStyle, this._symbolRegistry, this._patternRegistry, this._pixelRatio)
    this._datasetSourceMap.set(registryDataset.id, sourceId)
    this._maintainSymbolOrdering(registryDataset)
  }

  _getFirstSymbolLayerId () {
    const style = this._map.getStyle()
    if (!style?.layers) {
      return null
    }
    const layer = style.layers.find(styleLayer => this._symbolLayerIds.has(styleLayer.id))
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

  _setLayerVisibility (layerId, visibility) {
    if (this._map.getLayer(layerId)) {
      this._map.setLayoutProperty(layerId, 'visibility', visibility)
    }
  }

  _applyFeatureFilter (registryDataset) {
    const layersWithFilters = registryDataset.getLayersWithFilters()
    layersWithFilters.forEach(({ layerIds, filter }) => {
      layerIds.forEach(layerId => {
        if (this._map.getLayer(layerId)) {
          this._map.setFilter(layerId, filter)
        }
      })
    })
  }

  _setLayerOpacity (layerId, opacity) {
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
