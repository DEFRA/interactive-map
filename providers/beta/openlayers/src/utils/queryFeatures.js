import GeoJSON from 'ol/format/GeoJSON.js'
import TileState from 'ol/TileState.js'
import { renderFeatureToGeoJSON } from './vtTileFragments.js'
import { buildFilterEvaluator } from './filterEvaluator.js'

const CRS = 'EPSG:27700'

const geoJsonFormat = new GeoJSON({ dataProjection: CRS, featureProjection: CRS })

// Layers are classified by a `layerType` tag ('vector' | 'vectorTile') set at creation,
// not `instanceof VectorLayer`/`VectorTileLayer` — a UMD consumer loads this provider and
// other plugins (e.g. draw) as independently-bundled scripts, each with its own copy of
// ol, so a class reference from this bundle never matches an instance built by another.

// Mirror MapLibre's fallback: use property hash when feature has no explicit MVT ID.
// This deduplicates tile-split fragments that share the same properties.
const getVtFeatureId = (feature) => {
  const id = feature.getId()
  if (id !== null && id !== undefined) {
    return id
  }
  const props = { ...feature.getProperties() }
  delete props['mapbox-layer']
  return JSON.stringify(props)
}

// Shared result shape for a real ol/Feature identified by an OL *layer's* own layerId — used by
// plain 'vector' layers and by 'vectorTile' layers backed by the datasets plugin's own tiles
// (see layerBuilders.js's createDatasetLayer), as opposed to draw-ol's basemap MVT tiles, which
// are RenderFeatures identified per-feature via a MapLibre-style 'mapbox-layer' object instead.
const pushLayerIdResult = (results, seenKeys, layerId, feature) => {
  if (!layerId) {
    return
  }
  // getVtFeatureId's property-hash fallback (not raw feature.getId(), which is often undefined
  // for a plain geojson dataset with no id/idProperty) — same convention pushMapboxLayerResult
  // uses, needed so distinct id-less features sharing a source/layer don't collide onto the
  // same key and wrongly dedupe away.
  const key = `${layerId}:${getVtFeatureId(feature)}`
  if (seenKeys.has(key)) {
    return
  }
  seenKeys.add(key)
  results.push({
    id: feature.getId(),
    layer: { id: layerId },
    geometry: geoJsonFormat.writeGeometryObject(feature.getGeometry()),
    properties: feature.getProperties()
  })
}

const pushMapboxLayerResult = (results, seenKeys, mapboxLayer, feature) => {
  const styleLayerId = mapboxLayer?.id
  // background-type layers have no features in MapLibre — skip to match behaviour
  if (!styleLayerId || mapboxLayer?.type === 'background') {
    return
  }
  const key = `${styleLayerId}:${getVtFeatureId(feature)}`
  if (seenKeys.has(key)) {
    return
  }
  seenKeys.add(key)
  results.push({
    id: feature.getId(),
    layer: { id: styleLayerId },
    geometry: renderFeatureToGeoJSON(feature),
    properties: feature.getProperties()
  })
}

// Two different vector-tile producers share the 'vectorTile' layerType tag: draw-ol's basemap
// MVT tiles (a RenderFeature carrying a MapLibre-style 'mapbox-layer' object) and the datasets
// plugin's own tiles-backed datasets (a real ol/Feature with no 'mapbox-layer' at all, but the
// same 'layerId' tag plain 'vector' layers carry — see layerBuilders.js's createDatasetLayer).
const pushVectorTileResult = (results, seenKeys, layer, feature) => {
  const mapboxLayer = feature.get('mapbox-layer')
  if (mapboxLayer) {
    pushMapboxLayerResult(results, seenKeys, mapboxLayer, feature)
    return
  }
  pushLayerIdResult(results, seenKeys, layer.get('layerId'), feature)
}

export const queryFeatures = (map, point, options = {}) => {
  if (!point) {
    return []
  }
  const { radius = 10 } = options
  const pixel = [point.x, point.y]
  const results = []
  const seenKeys = new Set()

  map.forEachFeatureAtPixel(
    pixel,
    (feature, layer) => {
      if (layer.get('layerType') === 'vectorTile') {
        pushVectorTileResult(results, seenKeys, layer, feature)
      } else if (layer.get('layerType') === 'vector' && !layer.get('_highlight')) {
        pushLayerIdResult(results, seenKeys, layer.get('layerId'), feature)
      } else {
        // other layer types (e.g. TileLayer), or a highlight overlay — skip
      }
    },
    { hitTolerance: radius }
  )

  return results
}

/**
 * Returns every currently visible feature for the given layer ids, in the same
 * { id, layer: { id }, geometry, properties } shape queryFeatures() above uses — mirrors
 * MapLibre's map.queryRenderedFeatures(undefined, { layers }). Used by the interact plugin's
 * Features list (collectVisibleFeatures in useSpatialList.js) to find selectable/labelled
 * features without requiring a click.
 *
 * VectorTileLayer features come from currently-loaded tiles, the same source
 * collectTileFragments() reads (see vtTileFragments.js) — OL only loads tiles for the current
 * viewport (plus a small buffer), so "loaded" is a reasonable proxy for "visible" without a
 * separate extent check. A single logical feature can be split across tile boundaries, so
 * fragments are deduplicated the same way queryFeatures() does above.
 * VectorLayer features come directly from the source's current-viewport extent.
 *
 * Both branches apply each layer's own tagged filter (see buildFilterEvaluator) — unlike
 * queryFeatures() above, this reads straight off the source/tiles rather than off rendered
 * pixels, so it has no other way to know which of a shared source's features actually belong
 * to a given sibling sublayer.
 */
export const getVisibleFeatures = (map, layerIds) => {
  const wanted = new Set(layerIds)
  const results = []
  const seenKeys = new Set()
  const extent = map.getView().calculateExtent(map.getSize())

  map.getLayers().forEach(mapLayer => {
    if (mapLayer.get('layerType') === 'vectorTile') {
      const sourceTiles = mapLayer.getSource()?.sourceTiles_
      if (!sourceTiles) {
        return
      }
      const layerId = mapLayer.get('layerId')
      const matchesFilter = buildFilterEvaluator(mapLayer.get('filter'))
      Object.values(sourceTiles).forEach(tile => {
        if (tile.getState() !== TileState.LOADED) {
          return
        }
        tile.getFeatures().forEach(feature => {
          const mapboxLayer = feature.get('mapbox-layer')
          if (mapboxLayer) {
            if (wanted.has(mapboxLayer.id)) {
              pushMapboxLayerResult(results, seenKeys, mapboxLayer, feature)
            }
            return
          }
          if (wanted.has(layerId) && (!matchesFilter || matchesFilter(feature))) {
            pushLayerIdResult(results, seenKeys, layerId, feature)
          }
        })
      })
    } else if (mapLayer.get('layerType') === 'vector') {
      const layerId = mapLayer.get('layerId')
      if (!layerId || !wanted.has(layerId) || mapLayer.get('_highlight')) {
        return
      }
      const matchesFilter = buildFilterEvaluator(mapLayer.get('filter'))
      mapLayer.getSource()?.getFeaturesInExtent(extent).forEach(feature => {
        if (!matchesFilter || matchesFilter(feature)) {
          pushLayerIdResult(results, seenKeys, layerId, feature)
        }
      })
    } else {
      // other layer types (e.g. TileLayer) — skip
    }
  })

  return results
}
