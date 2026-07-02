import { transform as projTransform } from 'ol/proj.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import { testOLFeature, testRenderFeature, bestOf } from './snapGeometry.js'

// VectorTile geometry is clipped to a rectangle (tile extent + buffer), producing fake
// axis-aligned segments — and fake vertices where the clip cut the ring — that don't
// exist in the real data and mustn't be snap targets. They are detected by orientation:
// clip segments are exactly axis-aligned in tile space AND sit near a tile edge, a
// combination real boundaries essentially never produce. This works without knowing
// the exact buffer size the tiler used. Standard MVT buffer is 128/4096 tile units.
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

// Per-candidate context: the candidate's tile extent plus the two tolerances,
// computed once so both adjacent segments of a vertex reuse it.
const getClipContext = (state, coord) => {
  if (!state) { return null }
  const { tileGrid, viewProj, sourceProj, zoom } = state
  const toSource = (c) => c ? projTransform(c, viewProj, sourceProj) : null
  const anchor = toSource(coord)
  const tileCoord = tileGrid.getTileCoordForCoordAndZ(anchor, zoom)
  const extent = tileGrid.getTileCoordExtent(tileCoord)
  const tileWidth = extent[2] - extent[0]
  return {
    toSource,
    anchor,
    extent,
    // Coarse gate: within twice the standard MVT buffer of a tile edge. Generous on
    // purpose (the axis-alignment test does the real discrimination) so tilers with
    // a non-standard buffer size are still covered. Relative to tile width, so it is
    // projection-unit independent.
    band: tileWidth * (2 * MVT_BUFFER_UNITS / MVT_TILE_EXTENT),
    // MVT coordinates are quantized to 1/4096 of the tile extent; two quantization
    // steps of tolerance decides whether a segment is exactly axis-aligned.
    eps: 2 * (tileWidth / MVT_TILE_EXTENT)
  }
}

const isArtefactSegment = (ctx, pa, pb) => {
  if (!pa || !pb) { return false }
  const [minX, minY, maxX, maxY] = ctx.extent
  const nearEdge = (v, lo, hi) => Math.min(Math.abs(v - lo), Math.abs(v - hi)) <= ctx.band
  const vertical = Math.abs(pa[0] - pb[0]) <= ctx.eps && nearEdge(pa[0], minX, maxX)
  const horizontal = Math.abs(pa[1] - pb[1]) <= ctx.eps && nearEdge(pa[1], minY, maxY)
  return vertical || horizontal
}

// Edges: artefact when the snapped segment itself is an axis-aligned boundary segment.
// Vertices: fake vertices are the points where clipping cut the ring, i.e. endpoints
// of artefact segments — test both adjacent segments.
const isClipArtefact = (state, candidate) => {
  const ctx = getClipContext(state, candidate.coord)
  if (!ctx) { return false }
  if (candidate.type === 'edge') {
    const [a, b] = candidate.seg ?? []
    return isArtefactSegment(ctx, ctx.toSource(a), ctx.toSource(b))
  }
  const [prev, next] = candidate.adjacent ?? []
  return isArtefactSegment(ctx, ctx.anchor, ctx.toSource(prev)) ||
         isArtefactSegment(ctx, ctx.anchor, ctx.toSource(next))
}

// Read at call time so it can be toggled from the console at any point: window.DEBUG_SNAP_VISIBILITY = true
const isDebugEnabled = () => globalThis.DEBUG_SNAP_VISIBILITY === true

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

const logCandidate = (candidate, mapboxLayer) => {
  if (!isDebugEnabled()) { return }
  console.log('[snap-candidate-found]', {
    type: candidate.type,
    layerId: mapboxLayer?.id,
    layerType: mapboxLayer?.type,
    coord: [candidate.coord[0].toFixed(2), candidate.coord[1].toFixed(2)],
    distSq: candidate.distSq.toFixed(2)
  })
}

// Returns true when the candidate is a rendering artefact rather than a visible
// snap target: either a tile clip artefact, or an invisible same-fill boundary.
const shouldFilterCandidate = ({ candidate, cursorCoord, mapboxLayer, boundaryState, map, vtLayers, resolution }) => {
  if (isClipArtefact(boundaryState, candidate)) {
    if (isDebugEnabled()) { console.log('[snap-filtered] tile clip artefact', candidate.type) }
    return true
  }
  if (candidate.type === 'edge' && mapboxLayer?.type === 'fill' &&
      isInvisibleFillBoundary(candidate.coord, cursorCoord, mapboxLayer.id, map, vtLayers, resolution)) {
    if (isDebugEnabled()) { console.log('[snap-filtered] invisible fill boundary') }
    return true
  }
  return false
}

// Folds a feature's candidates into the current best, skipping rendering artefacts
const pickVisibleCandidates = (best, candidates, context) => {
  let result = best
  for (const candidate of candidates) {
    logCandidate(candidate, context.mapboxLayer)
    if (!shouldFilterCandidate({ candidate, ...context })) {
      result = bestOf(result, candidate)
    }
  }
  return result
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
    if (isDebugEnabled()) {
      console.log('[snap-query]', { coord: [coord[0].toFixed(2), coord[1].toFixed(2)], radiusPx, vtLayerCount: vtLayerNames.size, olLayerCount: olLayers.length })
    }
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
        best = bestOf(best, testOLFeature(feature, coord, toleranceSq))
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
            const candidates = testRenderFeature(feature, coord, toleranceSq)
            if (!candidates.length) { return }
            if (!tileBoundaryStates.has(layer)) {
              tileBoundaryStates.set(layer, buildTileBoundaryState(layer, map))
            }
            const boundaryState = tileBoundaryStates.get(layer)
            best = pickVisibleCandidates(best, candidates, { cursorCoord: coord, mapboxLayer, boundaryState, map, vtLayers, resolution })
          },
          { hitTolerance: radiusPx, layerFilter: (l) => vtLayers.includes(l) }
        )
      }
    }

    return best ? { type: best.type, coord: best.coord } : null
  }

  return { query, setLayers }
}
