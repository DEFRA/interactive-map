import VectorTileLayer from 'ol/layer/VectorTile.js'
import TileState from 'ol/TileState.js'
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

/**
 * Collects all loaded VT tile fragments for a feature across all VectorTileLayers.
 * OL clips VT features at tile boundaries, so a single logical feature appears as
 * multiple RenderFeature instances (one per tile). This gathers them all so callers
 * can work with the full feature geometry rather than a single clipped fragment.
 */
export const collectTileFragments = (map, layerId, featureId, idProperty) => {
  const fragments = []

  map.getLayers().forEach(mapLayer => {
    if (!(mapLayer instanceof VectorTileLayer)) {
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
        if (feature.get('mapbox-layer')?.id !== layerId) {
          return
        }
        const fid = idProperty ? feature.get(idProperty) : feature.getId()
        if (String(fid) !== String(featureId)) {
          return
        }
        fragments.push(renderFeatureToGeoJSON(feature))
      })
    })
  })

  return fragments
}
