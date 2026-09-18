import TileState from 'ol/TileState.js'
import GeoJSON from 'ol/format/GeoJSON.js'

const CRS = 'EPSG:27700'
const geoJsonFormat = new GeoJSON({ dataProjection: CRS, featureProjection: CRS })

const toPairs = (flat, start, end) => {
  const coords = []
  for (let i = start; i < end; i += 2) {
    coords.push([flat[i], flat[i + 1]])
  }
  return coords
}

export const renderFeatureToGeoJSON = (feature) => {
  const type = feature.getType()
  const flat = feature.getFlatCoordinates()

  if (type === 'Point') {
    return { type: 'Point', coordinates: [flat[0], flat[1]] }
  }
  if (type === 'LineString') {
    return { type: 'LineString', coordinates: toPairs(flat, 0, flat.length) }
  }
  if (type === 'Polygon') {
    const ends = feature.getEnds()
    let prev = 0
    const rings = ends.map(end => {
      const ring = toPairs(flat, prev, end)
      prev = end
      return ring
    })
    return { type: 'Polygon', coordinates: rings }
  }
  if (type === 'MultiPolygon') {
    const endss = feature.getEndss()
    let offset = 0
    const polys = endss.map(ends => {
      let prev = offset
      const rings = ends.map(end => {
        const ring = toPairs(flat, prev, end)
        prev = end
        return ring
      })
      offset = ends[ends.length - 1]
      return rings
    })
    return { type: 'MultiPolygon', coordinates: polys }
  }
  // MultiLineString / MultiPoint fallback
  return { type, coordinates: toPairs(flat, 0, flat.length) }
}

// Two different vector-tile producers reach this code: draw-ol's basemap MVT tiles
// (RenderFeature carrying a MapLibre-style 'mapbox-layer' object, no ol/Feature.getGeometry)
// and the datasets plugin's own tiles-backed datasets (a real ol/Feature — see
// plugins/datasets/src/adapters/openlayers/layerBuilders.js's createDatasetSource — with no
// 'mapbox-layer' at all, but a real getGeometry()). Branch on which shape this actually is.
const fragmentToGeoJSON = (feature) =>
  feature.getGeometry ? geoJsonFormat.writeGeometryObject(feature.getGeometry()) : renderFeatureToGeoJSON(feature)

/**
 * Collects all loaded VT tile fragments for a feature across all VectorTile/WebGLVectorTile
 * layers. OL clips VT features at tile boundaries, so a single logical feature appears as
 * multiple feature instances (one per tile). This gathers them all so callers can work with
 * the full feature geometry rather than a single clipped fragment.
 */
export const collectTileFragments = (map, layerId, featureId, idProperty) => {
  const fragments = []

  map.getLayers().forEach(mapLayer => {
    // Not `instanceof VectorTileLayer`: a UMD consumer loads this provider and other plugins
    // as independently-bundled scripts, each with its own copy of ol, so a class reference
    // from this bundle never matches an instance built by another — see queryFeatures.js's
    // own comment. This also covers WebGLVectorTileLayer, which instanceof VectorTileLayer
    // (the Canvas renderer's class) never matched at all, on any bundle.
    if (mapLayer.get('layerType') !== 'vectorTile') {
      return
    }
    const source = mapLayer.getSource()
    const sourceTiles = source?.sourceTiles_
    if (!sourceTiles) {
      return
    }
    Object.values(sourceTiles).forEach(tile => {
      if (tile.getState() !== TileState.LOADED) {
        return
      }
      tile.getFeatures().forEach(feature => {
        const styleLayerId = feature.get('mapbox-layer')?.id ?? mapLayer.get('layerId')
        if (styleLayerId !== layerId) {
          return
        }
        const fid = idProperty ? feature.get(idProperty) : feature.getId()
        if (String(fid) !== String(featureId)) {
          return
        }
        fragments.push(fragmentToGeoJSON(feature))
      })
    })
  })

  return fragments
}
