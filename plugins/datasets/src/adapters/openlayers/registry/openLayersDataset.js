import { MapboxStyleDataset } from '../../../registry/mapboxStyleDataset.js'
import { datasetRegistry } from '../../../registry/datasetRegistry.js'
import { getValueForStyle } from '../../../../../../src/utils/getValueForStyle.js'
import { getSymbolAnchor } from '../../../../../../src/utils/symbolUtils.js'
import { symbolRegistry } from '../../../../../../src/services/symbolRegistry.js'
import { getCachedSymbolDataUri, SYMBOL_RASTER_PIXEL_RATIO } from '../../../../../../providers/beta/openlayers/src/utils/symbolImages.js'

const MAX_TILE_ZOOM = 22
const DEFAULT_STROKE_WIDTH = 1

/**
 * OpenLayers implementation of the shared Dataset registry model.
 *
 * Unlike MapLibre — where fill/stroke/symbol are always separate map layers because a
 * MapLibre layer has exactly one paint type — OL's style is an ol/style/flat spec that can
 * combine fill+stroke (or an icon) for one feature in a single layer. So a dataset/sublayer
 * here maps to at most one OL layer (see leafLayerIds), not up to three.
 *
 * Opacity and visibility are applied at the OL *layer* level (layer.setOpacity/setVisible) by
 * the adapter, not baked into the style — so, unlike MapLibre's getFillSource/getStrokeSource/
 * getSymbolSource paint objects, flatStyle carries no opacity/visibility properties.
 */
export class OpenLayersDataset extends MapboxStyleDataset {
  get leafLayerIds () {
    if (this.hasSublayers) {
      return []
    }
    return (this.hasFill || this.hasStroke || this.hasSymbol) ? [this.id] : []
  }

  get source () {
    // Dynamic sources always start empty and are populated later via setData — the
    // MapLibre-shaped promoteId/generateId keys on dynamicGeoJSON.source don't apply to OL,
    // which has no source-level id-promotion concept (see idStrategy).
    if (this.hasDynamicGeoJSON) {
      return { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }
    }
    if (this.tiles) {
      return {
        type: 'vector',
        tiles: this.tiles,
        minzoom: this.minZoom || 0,
        maxzoom: this.maxZoom || MAX_TILE_ZOOM
      }
    }
    if (this.geojson) {
      return { type: 'geojson', data: this.geojson }
    }
    return null
  }

  /**
   * How to resolve each OL Feature's id from a GeoJSON feature, since ol/format/GeoJSON has no
   * MapLibre-style "promoteId" source option — a property can only be promoted to the feature's
   * id at ingestion time, by the layer builder, using this.
   * @returns {string|null} A feature property name to copy onto the OL feature's id, or null to
   *   use the GeoJSON feature's own native id (ol/format/GeoJSON's default).
   */
  get idStrategy () {
    // Mirrors _hiddenFeaturesIdExpression's own dynamicGeoJSON-first precedence: a dynamic
    // dataset's idProperty lives on its dynamicGeoJSON config, not the dataset definition
    // itself (see registry/dynamicGeoJson.js).
    if (this.hasDynamicGeoJSON) {
      return this.dynamicGeoJSON.idProperty || null
    }
    return this.idProperty || null
  }

  /**
   * Extends the shared Dataset.filter with a sourceLayer check when reading from a vector tile
   * source — several top-level datasets can point at the same tiles URL but each render only one
   * named layer within the tile (e.g. existing-fields/hedge-control both read
   * field_parcels_with_hedges_osgb36, but only field_parcels_osgb36/hedge_control respectively —
   * see layerBuilders.js's createDatasetSource for how they end up sharing one
   * VectorTileSource). MapLibre doesn't need this: its paint layers declare their own native
   * 'source-layer' property, entirely separate from `filter`. OL's vector tile layers have no
   * equivalent per-layer scoping, so it has to be folded into the same filter expression that's
   * evaluated for styling, checking the property ol/format/MVT's default layerName exposes it
   * under ('layer').
   * @returns {Array|undefined}
   */
  get filter () {
    const baseFilter = super.filter
    if (!this.sourceLayer) {
      return baseFilter
    }
    const sourceLayerFilter = ['==', ['get', 'layer'], this.sourceLayer]
    if (!baseFilter) {
      return sourceLayerFilter
    }
    return baseFilter[0] === 'all' ? [...baseFilter, sourceLayerFilter] : ['all', baseFilter, sourceLayerFilter]
  }

  // No filter → a plain FlatStyle applies unconditionally. With a filter (own filter and/or
  // hidden features), wrap in a single-rule array — OL renders nothing for features that
  // don't match, since there's no `else` rule. This is the same filter expression shape
  // MapLibre's Dataset.filter produces (get/in/literal/to-string/all/!), which OL's own
  // expression evaluator (ol/expr) shares operator-for-operator.
  _wrapWithFilter (style) {
    return this.filter ? [{ filter: this.filter, style }] : style
  }

  /**
   * The resolved base (normal) symbol imageId + anchor for this dataset — layerBuilders.js tags
   * the OL layer with this so highlightFeatures.js can resolve a select/active highlight image
   * for it (via symbolImages.js's getActiveSymbolImageId/getSelectedSymbolImageId) without
   * reaching back into the datasets plugin's own registries from a provider-level file, the same
   * way MapLibre's highlight code reads icon-image/icon-anchor straight off the rendered style
   * layer instead of re-deriving them.
   * @returns {{ imageId: string, anchor: number[] }|null}
   */
  get symbolMeta () {
    if (!this.hasSymbol) {
      return null
    }
    const imageId = symbolRegistry.getSymbolImageId(this.style, datasetRegistry.mapStyle, false, SYMBOL_RASTER_PIXEL_RATIO)
    if (!imageId) {
      return null
    }
    return { imageId, anchor: getSymbolAnchor(this.style, symbolRegistry.getSymbolDef(this.style)) }
  }

  // icon-scale genuinely gives resolution-independent crispness for symbols (see
  // symbolImages.js's module doc), so unlike patterns this never needs re-registration on
  // resize. Falls back to an empty style (no icon at all) until the image has been rasterised
  // ahead of time by the adapter (registerSymbol is async; this getter must stay synchronous).
  // Reuses symbolMeta rather than re-resolving getSymbolImageId/getSymbolDef itself — both
  // getters need the same imageId+anchor, and symbolRegistry.resolve()/getSymbolDef() aren't
  // free (colour resolution + hashing), so recomputing them a second time here would double the
  // cost of every layer build/restyle for no benefit.
  _symbolStyle () {
    const style = {}
    const meta = this.symbolMeta
    const dataUri = meta && getCachedSymbolDataUri(meta.imageId)
    if (dataUri) {
      style['icon-src'] = dataUri
      style['icon-anchor'] = meta.anchor
      style['icon-scale'] = 1 / SYMBOL_RASTER_PIXEL_RATIO
    }
    return this._wrapWithFilter(style)
  }

  /**
   * ol/style/flat FlatStyleLike for this dataset. A symbol dataset gets icon-src alone (see
   * _symbolStyle) — hasFill/hasStroke are false whenever hasSymbol is true, per the base Dataset.
   *
   * A pattern fill is never resolved here — it's built by canvasPatternStyle.js's genuinely
   * crisp CanvasPattern-based style instead (see layerBuilders.js's resolveLayerStyle), which
   * this getter knows nothing about. hasFill is also true for a pattern dataset (see base
   * Dataset.hasFill), so that's explicitly excluded here rather than emitting a meaningless
   * fill-color for it.
   * @returns {Object|Array<Object>}
   */
  get flatStyle () {
    if (this.hasSymbol) {
      return this._symbolStyle()
    }
    const mapStyleId = datasetRegistry.mapStyle?.id
    const style = {}
    if (this.hasFill && !this.hasPattern) {
      style['fill-color'] = getValueForStyle(this.style.fill, mapStyleId)
    }
    if (this.hasStroke) {
      style['stroke-color'] = getValueForStyle(this.style.stroke, mapStyleId)
      style['stroke-width'] = this.style.strokeWidth || DEFAULT_STROKE_WIDTH
      if (this.style.strokeDashArray) {
        style['stroke-line-dash'] = this.style.strokeDashArray
      }
    }
    return this._wrapWithFilter(style)
  }
}
