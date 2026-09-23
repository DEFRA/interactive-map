import VectorSource from 'ol/source/Vector.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorTileSource from 'ol/source/VectorTile.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import MVT from 'ol/format/MVT.js'
import Feature from 'ol/Feature.js'
import TileGrid from 'ol/tilegrid/TileGrid.js'
import { logger } from '../../../../../src/services/logger.js'
import { BNG_CRS } from '../../../../../providers/beta/openlayers/src/utils/bngProjection.js'
import { buildCanvasPatternStyle } from './canvasPatternStyle.js'

// Data and map both use BNG, so no coordinate transformation is needed. Importing bngProjection.js
// (rather than just the string) also registers EPSG:27700 with proj4/OL, needed for
// VectorTileSource's projection option below to resolve to a real projection.
const PROJECTION = BNG_CRS
const format = new GeoJSON({ dataProjection: PROJECTION, featureProjection: PROJECTION })

// The Mapbox style spec's minzoom/maxzoom are inclusive-min, exclusive-max; OL's own semantics
// are the exact opposite (exclusive-min, inclusive-max — see ol/layer/Layer.js's visibility
// check). Passing registryDataset.minZoom/maxZoom straight through was a real bug: every dataset
// at the shared default minZoom:6 vanished exactly at the map's own minZoom:6. Shifting both
// bounds down by a tiny epsilon reproduces the Mapbox-style semantics using OL's opposite sense.
const ZOOM_EPSILON = 1e-6
const toOlMinZoom = (minZoom) => (minZoom === undefined ? undefined : minZoom - ZOOM_EPSILON)
const toOlMaxZoom = (maxZoom) => (maxZoom === undefined ? undefined : maxZoom - ZOOM_EPSILON)

// Symbol (icon) layers always render above fill/stroke layers, regardless of add/remove order —
// mirrors MapLibreLayerAdapter's _maintainSymbolOrdering, but OL's zIndex sorting achieves the
// same guarantee with no imperative re-ordering step needed.
const SYMBOL_Z_INDEX = 1
const DEFAULT_Z_INDEX = 0

// Must stay in sync with the ST_MakeEnvelope(0, 0, 1300000, 1300000, 27700) bounds hardcoded in
// the farming-tiles server's own vector tile sources — a wrong tile grid silently misplaces or
// fails to load every tile. Independent of the ArcGIS-hosted OSGB36 tiles used elsewhere, which
// use a different origin/resolution/tileSize despite sharing the same EPSG:27700 projection.
const BNG_TILE_GRID_EXTENT = [0, 0, 1300000, 1300000]
const BNG_TILE_SIZE = 256
const BNG_TILE_GRID = new TileGrid({
  extent: BNG_TILE_GRID_EXTENT,
  origin: [BNG_TILE_GRID_EXTENT[0], BNG_TILE_GRID_EXTENT[3]],
  resolutions: Array.from({ length: 25 }, (_, zoom) => (BNG_TILE_GRID_EXTENT[2] - BNG_TILE_GRID_EXTENT[0]) / (BNG_TILE_SIZE * 2 ** zoom)),
  tileSize: BNG_TILE_SIZE
})

/**
 * Reads GeoJSON into OL Features, promoting idProperty onto each feature's id first —
 * ol/format/GeoJSON has no "promoteId" source option like MapLibre's, so a property can only
 * become the feature's id by rewriting the raw GeoJSON before it's parsed.
 * @param {Object} geojson - a GeoJSON FeatureCollection
 * @param {string|null} idProperty
 * @returns {import('ol/Feature.js').default[]}
 */
export const readGeoJSONFeatures = (geojson, idProperty) => {
  if (!idProperty) {
    return format.readFeatures(geojson)
  }
  const withPromotedIds = {
    ...geojson,
    features: geojson.features.map(feature => ({ ...feature, id: feature.properties?.[idProperty] ?? feature.id }))
  }
  return format.readFeatures(withPromotedIds)
}

/**
 * Fetch a geojson URL once and populate the given source — the OL equivalent of MapLibre's
 * native one-time fetch-on-load for a geojson source whose `data` is a URL string.
 * Fire-and-forget: the source is returned empty and populated when the fetch resolves, the
 * same "empty now, filled in later" shape dynamic sources already use via setData.
 * @param {import('ol/source/Vector.js').default} olSource
 * @param {string} url
 * @param {string|null} idProperty
 * @param {string} datasetId - for the warning message only
 */
const populateFromUrl = (olSource, url, idProperty, datasetId) => {
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`)
      }
      return response.json()
    })
    .then(geojson => olSource.addFeatures(readGeoJSONFeatures(geojson, idProperty)))
    .catch(error => logger.warn(`OpenLayers datasets adapter: failed to fetch geojson for dataset "${datasetId}" — ${error.message}`))
}

/**
 * Build the OL source for a dataset — a plain VectorSource for geojson/dynamicGeoJSON, or a
 * VectorTileSource (BNG-native tile grid, see BNG_TILE_GRID) for a tiles-backed dataset. Several
 * top-level datasets can point at the same tiles URL with different sourceLayer values (mirroring
 * MapLibre's own multiple-paint-layers-per-vector-source model, e.g. existing-fields/hedge-control
 * both reading field_parcels_with_hedges_*) — registryDataset.sourceId is already hashed from the
 * tiles URL (see Dataset.sourceId), so the adapter's source cache naturally shares one
 * VectorTileSource between them; only the per-layer style/filter (see OpenLayersDataset.filter)
 * distinguishes which sourceLayer each one actually renders.
 * @param {Object} registryDataset - an OpenLayersDataset
 * @returns {import('ol/source/Vector.js').default|import('ol/source/VectorTile.js').default|null}
 */
export const createDatasetSource = (registryDataset) => {
  const { source, id, idStrategy } = registryDataset
  if (!source) {
    return null
  }
  if (source.type === 'geojson') {
    const olSource = new VectorSource()
    if (typeof source.data === 'string') {
      populateFromUrl(olSource, source.data, idStrategy, id)
    } else if (source.data?.features?.length) {
      olSource.addFeatures(readGeoJSONFeatures(source.data, idStrategy))
    }
    return olSource
  }
  if (source.type === 'vector') {
    // tiles is accepted as either a single URL string or an array (MapLibre-style) elsewhere in
    // this codebase — see Dataset.sourceId's own Array.isArray check — but VectorTileSource's
    // urls option requires a real array.
    const urls = Array.isArray(source.tiles) ? source.tiles : [source.tiles]
    return new VectorTileSource({
      // A real ol/Feature (not MVT's default RenderFeature) — needed so canvasPatternStyle.js's
      // filter evaluator can call feature.getGeometry()/getProperties() the same way it does for
      // GeoJSON-backed features, and so getFeaturesInExtent-style consumers work uniformly.
      format: new MVT({ featureClass: Feature, idProperty: idStrategy || undefined }),
      urls,
      projection: PROJECTION,
      tileGrid: BNG_TILE_GRID
    })
  }
  logger.warn(`OpenLayers datasets adapter: unsupported source type "${source.type}" (dataset "${id}")`)
  return null
}

/**
 * The style value to hand to layer.setStyle()/the layer constructor: registryDataset's own
 * flatStyle, except for a pattern fill, which needs the genuinely crisp, CanvasPattern-based
 * style function from canvasPatternStyle.js instead — see that module's doc for why flat-style's
 * fill-pattern-src can't achieve this.
 * @param {Object} registryDataset - an OpenLayersDataset
 * @param {{ mapStyleId: string, pixelRatio: number, patternRegistry: Object }} context
 * @returns {Object|Array<Object>|import('ol/style/Style.js').StyleFunction}
 */
export const resolveLayerStyle = (registryDataset, { mapStyleId, pixelRatio, patternRegistry } = {}) => {
  if (registryDataset.hasPattern) {
    return buildCanvasPatternStyle(registryDataset, mapStyleId, pixelRatio, patternRegistry)
  }
  return registryDataset.flatStyle
}

/**
 * Build the OL layer for a dataset, wired to the given source — a Canvas VectorTileLayer for a
 * tiles-backed dataset, or a Canvas VectorLayer otherwise. For canvas patterns, also picks the
 * style pipeline (see resolveLayerStyle).
 * @param {Object} registryDataset - an OpenLayersDataset
 * @param {import('ol/source/Vector.js').default} olSource
 * @param {{ mapStyleId: string, pixelRatio: number, patternRegistry: Object }} context
 * @returns {import('ol/layer/Layer.js').default}
 */
export const createDatasetLayer = (registryDataset, olSource, context) => {
  const isTileSource = olSource instanceof VectorTileSource
  const LayerClass = isTileSource ? VectorTileLayer : VectorLayer
  const layer = new LayerClass({
    source: olSource,
    style: resolveLayerStyle(registryDataset, context),
    opacity: registryDataset.opacity,
    visible: registryDataset.visibility === 'visible',
    // See toOlMinZoom/toOlMaxZoom's comment: compensates OL's opposite inclusive/exclusive
    // sense at each boundary, to match MapLibre's minzoom/maxzoom (which registryDataset.
    // minZoom/maxZoom mirror) exactly.
    minZoom: toOlMinZoom(registryDataset.minZoom),
    maxZoom: toOlMaxZoom(registryDataset.maxZoom),
    zIndex: registryDataset.hasSymbol ? SYMBOL_Z_INDEX : DEFAULT_Z_INDEX,
    // ol/layer/VectorTile defaults to 'hybrid' (fills/strokes rasterised to an image tile,
    // redrawn only on tile load — cheaper, but visibly stale/blurry while panning/zooming
    // between loads). 'vector' re-renders true vector geometry every frame instead, matching
    // MapLibre's own always-vector tile rendering.
    ...(isTileSource ? { renderMode: 'vector' } : {})
  })
  // Required for the OL provider's queryFeatures/getVisibleFeatures (click-to-select, hover,
  // the interact plugin's Features list) to recognise this layer at all — untagged layers are
  // silently skipped there. 'layerId' must equal the (sub)dataset id so it matches what
  // interactPlugin's own layerId config is written against, same convention as MapLibre.
  // 'vectorTile' here is deliberately the *same* tag draw-ol's basemap MVT tiles use, but with a
  // different feature shape (a real ol/Feature carrying this dataset's own sourceLayer/id, not a
  // RenderFeature carrying a MapLibre-style 'mapbox-layer' object) — see queryFeatures.js, which
  // branches on which shape it's actually looking at.
  layer.set('layerType', isTileSource ? 'vectorTile' : 'vector')
  layer.set('layerId', registryDataset.id)
  // Sibling sublayers of the same parent share one OL source (see createDatasetSource's doc) —
  // the *style* only actually paints/hit-tests each sublayer's own filtered subset, but
  // queryFeatures.js's getVisibleFeatures reads straight off the shared source/tiles with no
  // rendering step involved, so it needs this same filter to know which features are actually
  // this sublayer's own, not just every feature the source happens to hold.
  if (registryDataset.filter) {
    layer.set('filter', registryDataset.filter)
  }
  // Lets highlightFeatures.js build a select/active highlight for a dataset symbol point —
  // see OpenLayersDataset.symbolMeta's doc.
  if (registryDataset.hasSymbol) {
    layer.set('symbolMeta', registryDataset.symbolMeta)
  }
  return layer
}
