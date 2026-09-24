import { OpenLayersDataset } from './registry/openLayersDataset.js'
import { datasetRegistry } from '../../registry/datasetRegistry.js'
import { MapboxStyleLayerAdapter } from '../mapboxStyleLayerAdapter.js'
import { createDatasetSource, createDatasetLayer, resolveLayerStyle, readGeoJSONFeatures } from './layerBuilders.js'
import { registerSymbols } from '../../../../../providers/beta/openlayers/src/utils/symbolImages.js'
import { registerCrispCanvasPatterns } from './canvasPatternStyle.js'
import { logger } from '../../../../../src/services/logger.js'

/**
 * OpenLayers implementation of the LayerAdapter interface for the datasets plugin.
 *
 * GeoJSON and vector tile datasets are both supported (see layerBuilders.createDatasetSource).
 * Pattern fills and symbols are both wired into OpenLayersDataset.getFlatStyle, registered ahead
 * of time here (see _registerPatterns/_registerSymbols) since getFlatStyle is synchronous.
 *
 * One OL layer per dataset/sublayer (see OpenLayersDataset's leafLayerIds), not up to three like
 * MapLibre — an ol/style/flat spec can combine fill+stroke (or an icon) for one feature in a
 * single layer. Sublayers of the same parent share one OL source (tracked by sourceId), each
 * with its own layer + filter-scoped style, mirroring how MapLibre sublayers share one source.
 */
export default class OpenLayersLayerAdapter extends MapboxStyleLayerAdapter {
  /**
   * @param {Object} mapProvider - Map provider instance (e.g. OpenLayersProvider)
   * @param {Object} symbolRegistry
   * @param {Object} patternRegistry
   */
  constructor (mapProvider, symbolRegistry, patternRegistry) {
    super(mapProvider, symbolRegistry, patternRegistry)
    // sourceId → OL source, shared across sublayers of the same dataset
    this._sourcesById = new Map()
    // leaf layer id (== dataset/sublayer id) → OL layer
    this._layersById = new Map()
    // initialiseDatasets.js passes this to datasetRegistry.attachCreateDataset unbound, then
    // calls it as registry._createDataset(...) — bind so `this` still resolves here, not to
    // the registry.
    this.createDataset = this.createDataset.bind(this)
  }

  createDataset (datasetDefinition) {
    return new OpenLayersDataset(datasetDefinition)
  }

  get _styleContext () {
    return { mapStyleId: datasetRegistry.mapStyle?.id, pixelRatio: this._pixelRatio, patternRegistry: this._patternRegistry }
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  async init () {
    await Promise.all([this._registerPatterns(), this._registerSymbols()])
    datasetRegistry.forEachDataset(registryDataset => this._addLayers(registryDataset))
  }

  destroy () {
    this._layersById.forEach(layer => this._map.removeLayer(layer))
    this._layersById.clear()
    this._sourcesById.clear()
  }

  // OL's basemap swap (see providers/beta/openlayers's appEvents.js) only replaces the base
  // tile layer — dataset layers are separate map.addLayer() entries and are never wiped, so
  // unlike MapLibre there's nothing to rebuild here, just colour tokens to re-resolve. Pattern
  // fg/bg colours can be mapStyle-keyed too, so re-registering (not just re-styling) is needed.
  async onMapStyleChange () {
    await Promise.all([this._registerPatterns(), this._registerSymbols()])
    datasetRegistry.forEachDataset(registryDataset => this._forEachLeafDataset(registryDataset, leaf => {
      this._setLayerStyle(leaf)
    }))
  }

  // Plain fill-color/stroke layers don't depend on map size at all. But pattern fills (see
  // canvasPatternStyle.js) and symbols are rasterised at the map's *actual* pixelRatio to stay
  // genuinely crisp, so a pixelRatio change (map resize) needs a fresh rasterisation and a
  // re-applied style, the same way MapLibreLayerAdapter.onMapSizeChange re-rasterises
  // symbols/patterns at the new ratio.
  async onMapSizeChange () {
    await Promise.all([this._registerPatterns(), this._registerSymbols()])
    datasetRegistry.forEachDataset(registryDataset => this._forEachLeafDataset(registryDataset, leaf => {
      if (leaf.hasPattern || leaf.hasSymbol) {
        this._setLayerStyle(leaf)
      }
    }))
  }

  // ─── Dataset operations ─────────────────────────────────────────────────────
  // addDataset is inherited from MapboxStyleLayerAdapter.

  _registerPatternsAndSymbols (registryDataset) {
    return Promise.all([this._registerPatterns([registryDataset]), this._registerSymbols([registryDataset])])
  }

  removeDataset (datasetId) {
    const registryDataset = datasetRegistry.getDataset(datasetId)
    if (!registryDataset) {
      return
    }
    registryDataset.layerIds.forEach(layerId => {
      const layer = this._layersById.get(layerId)
      if (layer) {
        this._map.removeLayer(layer)
        this._layersById.delete(layerId)
      }
    })

    const { sourceId } = registryDataset
    const sourceIsShared = datasetRegistry.topLevelDatasets()
      .some(dataset => dataset.id !== datasetId && dataset.sourceId === sourceId)
    if (!sourceIsShared) {
      this._sourcesById.delete(sourceId)
    }
  }

  async applyStyle (datasetId) {
    const registryDataset = datasetRegistry.getDataset(datasetId)
    if (!registryDataset) {
      return
    }
    // A style change can introduce a pattern/symbol that wasn't previously configured.
    await this._registerPatternsAndSymbols(registryDataset)
    this._forEachLeafDataset(registryDataset, leaf => {
      if (this._layersById.has(leaf.id)) {
        this._setLayerStyle(leaf)
      } else {
        this._addLayers(leaf)
      }
    })
  }

  // ─── Feature operations ─────────────────────────────────────────────────────
  // Opacity/visibility methods are inherited from MapboxStyleLayerAdapter.

  _setLayerOpacity (layerId, opacity) {
    this._layersById.get(layerId)?.setOpacity(opacity)
  }

  _setLayerVisibility (layerId, visibility) {
    this._layersById.get(layerId)?.setVisible(visibility === 'visible')
  }

  // Hidden features are baked into flatStyle's filter (see OpenLayersDataset), so applying the
  // filter means recomputing and re-setting style rather than a separate declarative call like
  // MapLibre's map.setFilter.
  applyFeatureFilter (datasetId) {
    const registryDataset = datasetRegistry.getDataset(datasetId)
    if (!registryDataset) {
      return
    }
    this._forEachLeafDataset(registryDataset, leaf => {
      this._setLayerStyle(leaf)
    })
  }

  setData (datasetId, geojson) {
    const registryDataset = datasetRegistry.getDataset(datasetId)
    const olSource = registryDataset && this._sourcesById.get(registryDataset.sourceId)
    if (!olSource) {
      return
    }
    olSource.clear()
    if (geojson?.features?.length) {
      olSource.addFeatures(readGeoJSONFeatures(geojson, registryDataset.idStrategy))
    }
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  // Rasterises and caches each pattern's image ahead of time, so OpenLayersDataset.getFlatStyle /
  // resolveLayerStyle (both synchronous) can find it already resolved — mirrors
  // MapLibreLayerAdapter's addPatternsAndSymbolsToMap, which likewise runs before _addLayers
  // reads the dataset's style. Goes through canvasPatternStyle.js's genuinely-crisp,
  // pixelRatio-scaled pipeline — see layerBuilders.js's resolveLayerStyle.
  async _registerPatterns (registryDatasets = datasetRegistry.topLevelDatasets()) {
    const styles = []
    registryDatasets.forEach(registryDataset => this._forEachLeafDataset(registryDataset, leaf => {
      if (leaf.hasPattern) {
        styles.push(leaf.style)
      }
    }))
    const mapStyleId = datasetRegistry.mapStyle?.id
    await registerCrispCanvasPatterns(styles, mapStyleId, this._patternRegistry, this._pixelRatio)
  }

  // Rasterises and caches each symbol's icon image ahead of time, at the map's current
  // pixelRatio, so OpenLayersDataset.getFlatStyle (synchronous) can find it already resolved —
  // same convention as _registerPatterns.
  async _registerSymbols (registryDatasets = datasetRegistry.topLevelDatasets()) {
    const styles = []
    registryDatasets.forEach(registryDataset => this._forEachLeafDataset(registryDataset, leaf => {
      if (leaf.hasSymbol) {
        styles.push(leaf.style)
      }
    }))
    await registerSymbols(styles, datasetRegistry.mapStyle, this._symbolRegistry, this._pixelRatio)
  }

  // ol/style/flat's expression parser is stricter than MapLibre's filter dialect in some places
  // — e.g. its "in" operator requires a real array second argument, where MapLibre also accepts
  // a bare scalar. A hand-authored dataset filter written for MapLibre can hit this; catch per
  // dataset so one bad config can't take down every other dataset's layers.
  _setLayerStyle (registryDataset) {
    const layer = this._layersById.get(registryDataset.id)
    if (!layer) {
      return
    }
    try {
      layer.setStyle(resolveLayerStyle(registryDataset, this._styleContext))
      // symbolMeta.imageId is only ever resolved for the 'normal' variant, but that's still
      // mapStyle-dependent (resolve() falls back to the scheme's own foreground/halo colours,
      // not just resolveActive/resolveSelected) — so onMapStyleChange (which calls this after
      // re-registering) needs this refreshed too, or highlightFeatures.js keeps reverse-mapping
      // from a stale, pre-switch base id forever (see layerBuilders.js's createDatasetLayer,
      // which sets this the same way when the layer is first built).
      if (registryDataset.hasSymbol) {
        layer.set('symbolMeta', registryDataset.getSymbolMeta(this._pixelRatio))
      }
    } catch (error) {
      logger.warn(`OpenLayers datasets adapter: failed to build a style for dataset "${registryDataset.id}" — ${error.message}`)
    }
  }

  _forEachLeafDataset (registryDataset, callback) {
    if (registryDataset.hasSublayers) {
      registryDataset.sublayers.forEach(sublayer => this._forEachLeafDataset(sublayer, callback))
      return
    }
    callback(registryDataset)
  }

  // Wrapped the same way _setLayerStyle/_addLayers wrap style/layer construction: a malformed
  // dataset config (e.g. a bad tile URL) should log and skip that one dataset, not crash the
  // whole init()/forEachDataset loop for every other dataset sharing it.
  _getOrCreateSource (registryDataset) {
    const { sourceId } = registryDataset
    if (this._sourcesById.has(sourceId)) {
      return this._sourcesById.get(sourceId)
    }
    let olSource
    try {
      olSource = createDatasetSource(registryDataset)
    } catch (error) {
      logger.warn(`OpenLayers datasets adapter: failed to build a source for dataset "${registryDataset.id}" — ${error.message}`)
      return null
    }
    if (olSource) {
      this._sourcesById.set(sourceId, olSource)
    }
    return olSource
  }

  _addLayers (registryDataset) {
    if (registryDataset.hasSublayers) {
      // A sublayer's own geojson/tiles is always undefined (Dataset.tiles/geojson don't
      // inherit from parent) — the shared source can only be built from the parent's own
      // source descriptor, so create/cache it here before any sublayer looks it up by sourceId.
      this._getOrCreateSource(registryDataset)
      registryDataset.sublayers.forEach(sublayer => this._addLayers(sublayer))
      return
    }
    if (!registryDataset.leafLayerIds.length) {
      return
    }
    const olSource = this._getOrCreateSource(registryDataset)
    if (!olSource) {
      return
    }
    let layer
    try {
      // See _setLayerStyle's comment: a flatStyle built from a hand-authored filter can throw.
      layer = createDatasetLayer(registryDataset, olSource, this._styleContext)
    } catch (error) {
      logger.warn(`OpenLayers datasets adapter: failed to build a style for dataset "${registryDataset.id}" — ${error.message}`)
      return
    }
    this._map.addLayer(layer)
    this._layersById.set(registryDataset.id, layer)
  }
}
