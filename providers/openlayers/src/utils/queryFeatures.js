import VectorTileLayer from 'ol/layer/VectorTile.js'
import VectorLayer from 'ol/layer/Vector.js'
import GeoJSON from 'ol/format/GeoJSON.js'
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
