import VectorTileLayer from 'ol/layer/VectorTile.js'
import VectorLayer from 'ol/layer/Vector.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import TileState from 'ol/TileState.js'
import { renderFeatureToGeoJSON } from './vtTileFragments.js'

const CRS = 'EPSG:27700'

const geoJsonFormat = new GeoJSON({ dataProjection: CRS, featureProjection: CRS })

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
      if (layer instanceof VectorTileLayer) {
        const mapboxLayer = feature.get('mapbox-layer')
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
      } else if (layer instanceof VectorLayer) {
        const layerId = layer.get('layerId')
        if (!layerId || layer.get('_highlight')) {
          return
        }
        const featureId = feature.getId()
        const key = `${layerId}:${featureId}`
        if (seenKeys.has(key)) {
          return
        }
        seenKeys.add(key)
        results.push({
          id: featureId,
          layer: { id: layerId },
          geometry: geoJsonFormat.writeGeometryObject(feature.getGeometry()),
          properties: feature.getProperties()
        })
      } else {
        // other layer types (e.g. TileLayer) — skip
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
 * Features list (collectVisibleFeatures in useMapItemList.js) to find selectable/labelled
 * features without requiring a click.
 *
 * VectorTileLayer features come from currently-loaded tiles, the same source
 * collectTileFragments() reads (see vtTileFragments.js) — OL only loads tiles for the current
 * viewport (plus a small buffer), so "loaded" is a reasonable proxy for "visible" without a
 * separate extent check. A single logical feature can be split across tile boundaries, so
 * fragments are deduplicated the same way queryFeatures() does above.
 * VectorLayer features come directly from the source's current-viewport extent.
 */
export const getVisibleFeatures = (map, layerIds) => {
  const wanted = new Set(layerIds)
  const results = []
  const seenKeys = new Set()
  const extent = map.getView().calculateExtent(map.getSize())

  map.getLayers().forEach(mapLayer => {
    if (mapLayer instanceof VectorTileLayer) {
      const sourceTiles = mapLayer.getSource()?.sourceTiles_
      if (!sourceTiles) {
        return
      }
      Object.values(sourceTiles).forEach(tile => {
        if (tile.getState() !== TileState.LOADED) {
          return
        }
        tile.getFeatures().forEach(feature => {
          const mapboxLayer = feature.get('mapbox-layer')
          const styleLayerId = mapboxLayer?.id
          // background-type layers have no features in MapLibre — skip to match behaviour
          if (!styleLayerId || !wanted.has(styleLayerId) || mapboxLayer?.type === 'background') {
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
        })
      })
    } else if (mapLayer instanceof VectorLayer) {
      const layerId = mapLayer.get('layerId')
      if (!layerId || !wanted.has(layerId) || mapLayer.get('_highlight')) {
        return
      }
      mapLayer.getSource()?.getFeaturesInExtent(extent).forEach(feature => {
        results.push({
          id: feature.getId(),
          layer: { id: layerId },
          geometry: geoJsonFormat.writeGeometryObject(feature.getGeometry()),
          properties: feature.getProperties()
        })
      })
    } else {
      // other layer types (e.g. TileLayer) — skip
    }
  })

  return results
}
