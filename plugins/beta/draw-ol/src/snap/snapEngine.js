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

export const SNAP_RADIUS_PX = 12

export const createSnapEngine = (map, snapLayers = []) => {
  const vtLayerNames = new Set()
  const olLayers = []

  for (const entry of snapLayers) {
    if (typeof entry === 'string') {
      vtLayerNames.add(entry)
    } else if (entry instanceof VectorLayer) {
      olLayers.push(entry)
    }
  }

  // Collected on each query — VectorTileLayers are replaced when the map style changes
  const getVTLayers = () => {
    const layers = []
    map.getLayers().forEach(l => {
      if (l instanceof VectorTileLayer) layers.push(l)
    })
    return layers
  }

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

    const update = (r) => {
      if (!r) return
      if (!best) { best = r; return }
      if (best.type === 'vertex' && r.type === 'edge') return
      if (best.type === 'edge' && r.type === 'vertex') { best = r; return }
      if (r.distSq < best.distSq) best = r
    }

    // --- OL VectorLayer sources ---
    for (const layer of olLayers) {
      const source = layer.getSource()
      if (!source) {
        continue
      }
      for (const feature of source.getFeaturesInExtent(ext)) {
        update(testOLFeature(feature, coord, toleranceSq))
      }
    }

    // --- VectorTile layers ---
    if (vtLayerNames.size > 0) {
      const vtLayers = getVTLayers()
      if (vtLayers.length > 0) {
        const pixel = map.getPixelFromCoordinate(coord)
        if (pixel) {
          map.forEachFeatureAtPixel(
            pixel,
            (feature, _layer) => {
              if (!vtLayerNames.has(feature.get('mapbox-layer')?.id)) {
                return
              }
              update(testRenderFeature(feature, coord, toleranceSq))
            },
            {
              hitTolerance: radiusPx,
              layerFilter: (l) => vtLayers.includes(l)
            }
          )
        }
      }
    }

    return best ? { type: best.type, coord: best.coord } : null
  }

  return { query }
}
