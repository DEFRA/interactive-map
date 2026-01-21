import MapboxSnap from 'mapbox-gl-snap/dist/esm/MapboxSnap.js'
import { lineString } from '@turf/helpers'

/**
 * Apply patches to MapboxSnap prototype to fix bugs and add MapLibre compatibility
 * These patches are applied once globally
 */
function applyMapboxSnapPatches() {
  // Patch getLines for MultiLineString typo (coodinates -> coordinates)
  if (!MapboxSnap.prototype.__patchedGetLines) {
    const originalGetLines = MapboxSnap.prototype.getLines
    MapboxSnap.prototype.getLines = function(feature, mouse, radiusArg) {
      if (!feature.geometry) return []

      // Fix typo: original uses 'coodinates' instead of 'coordinates'
      if (feature.geometry.type === 'MultiLineString') {
        const coords = feature.geometry.coordinates || []
        return coords.map(c => lineString(c))
      }

      return originalGetLines.call(this, feature, mouse, radiusArg)
    }
    MapboxSnap.prototype.__patchedGetLines = true
  }

  // Patch getCloseFeatures to query within radius bbox instead of just point
  if (!MapboxSnap.prototype.__patchedGetCloseFeatures) {
    const originalGetCloseFeatures = MapboxSnap.prototype.getCloseFeatures
    MapboxSnap.prototype.getCloseFeatures = function(e, radiusInMeters) {
      const r = this.options.radius || 15
      const bbox = [
        [e.point.x - r, e.point.y - r],
        [e.point.x + r, e.point.y + r]
      ]
      const originalPoint = e.point
      e.point = bbox
      const result = originalGetCloseFeatures.call(this, e, radiusInMeters)
      e.point = originalPoint
      return result
    }
    MapboxSnap.prototype.__patchedGetCloseFeatures = true
  }
}

/**
 * Patch a GeoJSON source to expose _data for MapboxSnap compatibility
 * MapboxSnap expects source._data.features but MapLibre doesn't expose this
 * @param {object} source - MapLibre GeoJSON source
 */
function patchSourceData(source) {
  if (!source) return

  // Only patch if _data doesn't exist or doesn't have valid features array
  if (source._data && Array.isArray(source._data?.features)) {
    return
  }

  let dataCache = { type: 'FeatureCollection', features: [] }
  Object.defineProperty(source, '_data', {
    get() {
      return dataCache
    },
    set(val) {
      if (val && typeof val === 'object' && Array.isArray(val.features)) {
        dataCache = val
      } else {
        dataCache = { type: 'FeatureCollection', features: [] }
      }
    },
    configurable: true
  })
}

/**
 * Initialize MapboxSnap with MapLibre + MapboxDraw safely
 * @param {maplibregl.Map} map - MapLibre map instance
 * @param {MapboxDraw} draw - MapboxDraw instance
 * @param {object} snapOptions - Options for MapboxSnap
 * @param {string[]} [snapOptions.layers=[]] - Layer IDs to snap to
 * @param {number} [snapOptions.radius=15] - Snap radius in pixels
 * @param {string[]} [snapOptions.rules=['vertex', 'midpoint', 'edge']] - Snap rules
 * @param {boolean} [snapOptions.status=true] - Initial snap status
 * @param {Function} [snapOptions.onSnapped] - Callback when snap occurs
 * @returns {MapboxSnap} The initialized snap instance
 */
export function initMapLibreSnap(map, draw, snapOptions = {}) {
  const {
    layers = [],
    radius = 15,
    rules = ['vertex', 'midpoint', 'edge'],
    status = true,
    onSnapped = () => {}
  } = snapOptions

  // Apply global patches to MapboxSnap prototype
  applyMapboxSnapPatches()

  // Wait for draw sources to exist before initializing
  function patchAndInit() {
    const source = map.getSource('mapbox-gl-draw-hot')
    if (!source) {
      requestAnimationFrame(patchAndInit)
      return
    }

    // Patch source for MapLibre compatibility
    patchSourceData(source)

    // Create snap instance
    const snap = new MapboxSnap({
      map,
      drawing: draw,
      options: { layers, radius, rules },
      status,
      onSnapped
    })

    // Expose snap instance on map for use in draw modes
    map._snapInstance = snap

    return snap
  }

  return patchAndInit()
}
