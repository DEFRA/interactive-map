import MapboxSnap from 'mapbox-gl-snap/dist/esm/MapboxSnap.js'
import { lineString } from '@turf/helpers'

// Default snap indicator colors
const DEFAULT_COLORS = { vertex: '#f47738', midpoint: '#00703c', edge: '#1d70b8' }

// Store original methods for patching
let originalMethods = null

// Current colors
let colors = { ...DEFAULT_COLORS }

/**
 * Apply patches to MapboxSnap prototype to fix bugs and add MapLibre compatibility
 * @param {object} [customColors] - Custom colors { vertex, midpoint, edge }
 */
function applyMapboxSnapPatches(customColors = {}) {
  colors = { ...DEFAULT_COLORS, ...customColors }

  // Store original methods on first call
  if (!originalMethods) {
    originalMethods = {
      getLines: MapboxSnap.prototype.getLines,
      getCloseFeatures: MapboxSnap.prototype.getCloseFeatures,
      searchInVertex: MapboxSnap.prototype.searchInVertex,
      searchInMidPoint: MapboxSnap.prototype.searchInMidPoint,
      searchInEdge: MapboxSnap.prototype.searchInEdge
    }
  }

  // Patch getLines for MultiLineString typo (coodinates -> coordinates)
  if (!MapboxSnap.prototype.__patchedGetLines) {
    MapboxSnap.prototype.getLines = function(feature, mouse, radiusArg) {
      if (!feature.geometry) {
        return []
      }

      // Fix typo: original uses 'coodinates' instead of 'coordinates'
      if (feature.geometry.type === 'MultiLineString') {
        const coords = feature.geometry.coordinates || []
        return coords.map(c => lineString(c))
      }

      return originalMethods.getLines.call(this, feature, mouse, radiusArg)
    }
    MapboxSnap.prototype.__patchedGetLines = true
  }

  // Patch getCloseFeatures to query within radius bbox instead of just point
  if (!MapboxSnap.prototype.__patchedGetCloseFeatures) {
    MapboxSnap.prototype.getCloseFeatures = function(e, radiusInMeters) {
      const r = this.options.radius || 15
      const bbox = [
        [e.point.x - r, e.point.y - r],
        [e.point.x + r, e.point.y + r]
      ]
      const originalPoint = e.point
      e.point = bbox
      const result = originalMethods.getCloseFeatures.call(this, e, radiusInMeters)
      e.point = originalPoint
      return result
    }
    MapboxSnap.prototype.__patchedGetCloseFeatures = true
  }

  // Patch color methods to use custom colors
  if (!MapboxSnap.prototype.__patchedColors) {
    MapboxSnap.prototype.searchInVertex = function(...args) {
      const result = originalMethods.searchInVertex.apply(this, args)
      if (result) result.color = colors.vertex
      return result
    }

    MapboxSnap.prototype.searchInMidPoint = function(...args) {
      const result = originalMethods.searchInMidPoint.apply(this, args)
      if (result) result.color = colors.midpoint
      return result
    }

    MapboxSnap.prototype.searchInEdge = function(...args) {
      const result = originalMethods.searchInEdge.apply(this, args)
      if (result) result.color = colors.edge
      return result
    }

    MapboxSnap.prototype.__patchedColors = true
  }
}

/**
 * Poll for a condition to be met
 * @param {Function} checkFn - Returns truthy value when condition is met
 * @param {Function} onSuccess - Called with checkFn result when condition is met
 */
function pollUntil(checkFn, onSuccess) {
  function poll() {
    const result = checkFn()
    if (result) {
      onSuccess(result)
    } else {
      requestAnimationFrame(poll)
    }
  }
  poll()
}

/**
 * Patch a GeoJSON source to expose _data for MapboxSnap compatibility
 * MapboxSnap expects source._data.features but MapLibre doesn't expose this
 * @param {object} source - MapLibre GeoJSON source
 */
export function patchSourceData(source) {
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
 * @param {object} [snapOptions.colors] - Custom colors { vertex, midpoint, edge }
 */
export function initMapLibreSnap(map, draw, snapOptions = {}) {
  const {
    layers = [],
    radius = 15,
    rules = ['vertex', 'midpoint', 'edge'],
    status = false,
    onSnapped = () => {},
    colors = {}
  } = snapOptions

  // Apply global patches to MapboxSnap prototype
  applyMapboxSnapPatches(colors)

  // Clean up old snap instance's source and layer
  function cleanupOldSnap() {
    if (map.getLayer('snap-helper-circle')) {
      map.removeLayer('snap-helper-circle')
    }
    if (map.getSource('snap-helper-circle')) {
      map.removeSource('snap-helper-circle')
    }
  }

  // Create snap instance once source is available
  function createSnap(source) {
    patchSourceData(source)

    const snap = new MapboxSnap({
      map,
      drawing: draw,
      options: { layers, radius, rules },
      status,
      onSnapped
    })

    map._snapInstance = snap
    return snap
  }

  // Reinitialize snap after style changes (sources and layers get recreated)
  map.on('style.load', () => {
    pollUntil(
      () => map.getSource('mapbox-gl-draw-hot'),
      (source) => {
        cleanupOldSnap()
        createSnap(source)
      }
    )
  })

  // Hide snap indicator during zoom
  map.on('zoomstart', () => {
    if (map.getLayer('snap-helper-circle')) {
      map.setLayoutProperty('snap-helper-circle', 'visibility', 'none')
    }
  })

  map.on('zoomend', () => {
    if (map.getLayer('snap-helper-circle')) {
      map.setLayoutProperty('snap-helper-circle', 'visibility', 'visible')
    }
  })

  // Initial setup - poll until draw source exists
  pollUntil(
    () => map.getSource('mapbox-gl-draw-hot'),
    createSnap
  )
}
