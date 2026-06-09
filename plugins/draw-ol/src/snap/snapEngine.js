/**
 * Snap candidate engine.
 *
 * Accepts two kinds of entry in snapLayers:
 *   - string  → a VectorTile style-layer name (matched via feature.get('layer'))
 *               All VectorTileLayers on the map are searched; only features whose
 *               style-layer name is in the set are tested.
 *   - OL VectorLayer instance → all features in that layer's source are tested.
 *
 * query() is synchronous and uses:
 *   - VectorSource.getFeaturesInExtent() for OL vector layers (internal rBush, fast)
 *   - map.forEachFeatureAtPixel() for VectorTile layers (rendered tile data)
 */

import VectorLayer from 'ol/layer/Vector.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import { testOLFeature, testRenderFeature } from './snapGeometry.js'

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

  /**
   * Find the nearest snap candidate to coord within radiusPx screen pixels.
   * @param {number[]} coord - map coordinate [x, y]
   * @param {number} radiusPx - tolerance in screen pixels
   * @returns {{ type: 'vertex'|'edge', coord: number[] } | null}
   */
  const query = (coord, radiusPx) => {
    const resolution = map.getView().getResolution()
    if (!resolution) {
      return null
    }
    const toleranceMapUnits = radiusPx * resolution
    const toleranceSq = toleranceMapUnits * toleranceMapUnits
    const ext = [
      coord[0] - toleranceMapUnits,
      coord[1] - toleranceMapUnits,
      coord[0] + toleranceMapUnits,
      coord[1] + toleranceMapUnits
    ]

    let best = null

    // --- OL VectorLayer sources ---
    for (const layer of olLayers) {
      const source = layer.getSource()
      if (!source) {
        continue
      }
      for (const feature of source.getFeaturesInExtent(ext)) {
        best = pickBest(best, testOLFeature(feature, coord, toleranceSq))
      }
    }

    // --- VectorTile layers ---
    if (vtLayerNames.size > 0) {
      const vtLayers = getVTLayers(map)
      const pixel = vtLayers.length > 0 ? map.getPixelFromCoordinate(coord) : null
      if (pixel) {
        map.forEachFeatureAtPixel(
          pixel,
          (feature, _layer) => {
            if (!vtLayerNames.has(feature.get('mapbox-layer')?.id)) { return }
            best = pickBest(best, testRenderFeature(feature, coord, toleranceSq))
          },
          { hitTolerance: radiusPx, layerFilter: (l) => vtLayers.includes(l) }
        )
      }
    }

    return best ? { type: best.type, coord: best.coord } : null
  }

  return { query, setLayers }
}
