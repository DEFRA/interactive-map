import { transform as projTransform } from 'ol/proj.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import { testOLFeature, testRenderFeature } from './snapGeometry.js'

// VectorTile features are clipped to tile extents, producing artificial straight edges at tile
// boundaries. MVT tiles also carry a buffer region (geometry from adjacent tiles extending
// past the tile boundary). Both the exact boundary and the buffer zone must be filtered.
// Standard MVT buffer is 128 out of 4096 tile coordinate units.
const TILE_BOUNDARY_EPS = 1 // source-projection units of margin beyond the buffer
const MVT_BUFFER_UNITS = 128
const MVT_TILE_EXTENT = 4096

const buildTileBoundaryState = (layer, map) => {
  const source = layer.getSource()
  const tileGrid = source?.getTileGrid()
  if (!tileGrid) { return null }
  const viewProj = map.getView().getProjection()
  const sourceProj = source.getProjection() ?? viewProj
  const zoom = tileGrid.getZForResolution(map.getView().getResolution(), 0)
  return { tileGrid, viewProj, sourceProj, zoom }
}

const isOnTileBoundary = (state, coord) => {
  if (!state) { return false }
  const { tileGrid, viewProj, sourceProj, zoom } = state
  const c = projTransform(coord, viewProj, sourceProj)
  const tileCoord = tileGrid.getTileCoordForCoordAndZ(c, zoom)
  const [minX, minY, maxX, maxY] = tileGrid.getTileCoordExtent(tileCoord)
  // Buffer zone in source projection: edges within this distance of a tile boundary are
  // MVT buffer clip artefacts (geometry from the adjacent tile included for rendering overlap).
  const tileBuffer = (maxX - minX) * (MVT_BUFFER_UNITS / MVT_TILE_EXTENT)
  const eps = tileBuffer + TILE_BOUNDARY_EPS
  return (
    Math.abs(c[0] - minX) < eps ||
    Math.abs(c[0] - maxX) < eps ||
    Math.abs(c[1] - minY) < eps ||
    Math.abs(c[1] - maxY) < eps
  )
}

// Two same-style fill polygons share an invisible boundary — snapping to it is confusing.
// Detect this by projecting a test point slightly past the snap position (away from the cursor)
// and checking whether the same fill layer covers that side too.
// If it does → same-style invisible boundary → skip.
// If not (empty space, road, different layer) → visible outer edge → include.
const INVISIBLE_FILL_MIN_DIST_SQ = 1 // (1m)² — below this, cursor is on the edge, skip direction check

const isInvisibleFillBoundary = (edgeCoord, cursorCoord, layerId, map, vtLayers, resolution) => {
  const dx = edgeCoord[0] - cursorCoord[0]
  const dy = edgeCoord[1] - cursorCoord[1]
  const distSq = dx * dx + dy * dy
  if (distSq < INVISIBLE_FILL_MIN_DIST_SQ) { return false }
  const dist = Math.sqrt(distSq)
  const step = resolution * 4
  const testCoord = [edgeCoord[0] + (dx / dist) * step, edgeCoord[1] + (dy / dist) * step]
  const testPixel = map.getPixelFromCoordinate(testCoord)
  if (!testPixel) { return false }
  return !!map.forEachFeatureAtPixel(
    testPixel,
    (f) => f.get('mapbox-layer')?.id === layerId,
    { hitTolerance: 2, layerFilter: (l) => vtLayers.includes(l) }
  )
}

const pickBest = (a, b) => {
  if (!b) { return a }
  if (!a) { return b }
  if (a.type === 'vertex' && b.type === 'edge') { return a }
  if (a.type === 'edge' && b.type === 'vertex') { return b }
  return b.distSq < a.distSq ? b : a
}

// Collected on each query — VectorTileLayers are replaced when the map style changes
const getVTLayers = (map) => {
  const layers = []
  map.getLayers().forEach(l => {
    if (l instanceof VectorTileLayer) { layers.push(l) }
  })
  return layers
}

export const createSnapEngine = (map, snapLayers = []) => {
  let vtLayerNames = new Set()
  let olLayers = []

  const setLayers = (layers) => {
    vtLayerNames = new Set()
    olLayers = []
    for (const entry of layers ?? []) {
      if (typeof entry === 'string') {
        vtLayerNames.add(entry)
      } else if (entry instanceof VectorLayer) {
        olLayers.push(entry)
      } else {
        // unsupported layer type — skip
      }
    }
  }

  setLayers(snapLayers)

  const query = (coord, radiusPx) => {
    const resolution = map.getView().getResolution()
    if (!resolution) { return null }
    const toleranceMapUnits = radiusPx * resolution
    const toleranceSq = toleranceMapUnits * toleranceMapUnits
    const ext = [
      coord[0] - toleranceMapUnits,
      coord[1] - toleranceMapUnits,
      coord[0] + toleranceMapUnits,
      coord[1] + toleranceMapUnits
    ]

    let best = null

    for (const layer of olLayers) {
      const source = layer.getSource()
      if (!source) { continue }
      for (const feature of source.getFeaturesInExtent(ext)) {
        best = pickBest(best, testOLFeature(feature, coord, toleranceSq))
      }
    }

    if (vtLayerNames.size > 0) {
      const vtLayers = getVTLayers(map)
      const pixel = vtLayers.length > 0 ? map.getPixelFromCoordinate(coord) : null
      if (pixel) {
        const tileBoundaryStates = new Map()
        map.forEachFeatureAtPixel(
          pixel,
          (feature, layer) => {
            const mapboxLayer = feature.get('mapbox-layer')
            if (!vtLayerNames.has(mapboxLayer?.id)) { return }
            const candidate = testRenderFeature(feature, coord, toleranceSq)
            if (!candidate) { return }
            if (!tileBoundaryStates.has(layer)) {
              tileBoundaryStates.set(layer, buildTileBoundaryState(layer, map))
            }
            if (isOnTileBoundary(tileBoundaryStates.get(layer), candidate.coord)) { return }
            if (candidate.type === 'edge' && mapboxLayer?.type === 'fill' && isInvisibleFillBoundary(candidate.coord, coord, mapboxLayer.id, map, vtLayers, resolution)) { return }
            best = pickBest(best, candidate)
          },
          { hitTolerance: radiusPx, layerFilter: (l) => vtLayers.includes(l) }
        )
      }
    }

    return best ? { type: best.type, coord: best.coord } : null
  }

  return { query, setLayers }
}
