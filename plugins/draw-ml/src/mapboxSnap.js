import MapboxSnap from 'mapbox-gl-snap/dist/esm/MapboxSnap.js'
import { polygon, lineString } from '@turf/helpers'

// Default snap indicator colors
const DEFAULT_COLORS = { vertex: '#f47738', midpoint: '#00703c', edge: '#1d70b8' }

// Store original methods for patching - use a symbol to survive hot reloads
const ORIGINAL_METHODS_KEY = Symbol.for('mapboxSnapOriginalMethods')

// Get or create original methods storage that survives hot reload
function getOriginalMethods() {
  if (!globalThis[ORIGINAL_METHODS_KEY]) {
    // Only store originals if the prototype hasn't been patched yet
    // This prevents storing already-patched methods on hot reload
    if (!MapboxSnap.prototype.__patchedSnapToClosestPoint) {
      globalThis[ORIGINAL_METHODS_KEY] = {
        getLines: MapboxSnap.prototype.getLines,
        getCloseFeatures: MapboxSnap.prototype.getCloseFeatures,
        searchInVertex: MapboxSnap.prototype.searchInVertex,
        searchInMidPoint: MapboxSnap.prototype.searchInMidPoint,
        searchInEdge: MapboxSnap.prototype.searchInEdge,
        snapToClosestPoint: MapboxSnap.prototype.snapToClosestPoint,
        changeSnappedPoints: MapboxSnap.prototype.changeSnappedPoints
      }
    }
  }
  return globalThis[ORIGINAL_METHODS_KEY]
}

// Current colors
let colors = { ...DEFAULT_COLORS }

/**
 * Apply patches to MapboxSnap prototype to fix bugs and add MapLibre compatibility
 * @param {object} [customColors] - Custom colors { vertex, midpoint, edge }
 */
function applyMapboxSnapPatches(customColors = {}, layers) {
  colors = { ...DEFAULT_COLORS, ...customColors }

  // Apply patches that don't need originalMethods first (these can run on every call)
  // These add early-exit checks to reduce Safari overhead

  // Patch setMapData to ensure layer visibility when we have snap data
  // Only update visibility if snap is actually enabled to prevent accumulating calls
  if (!MapboxSnap.prototype.__patchedSetMapData) {
    const originalSetMapData = MapboxSnap.prototype.setMapData
    if (originalSetMapData) {
      MapboxSnap.prototype.setMapData = function(data) {
        // Skip entirely if snap is disabled - prevents unnecessary layer operations
        if (!this.status) {
          return
        }
        const result = originalSetMapData.call(this, data)
        // Ensure layer is visible when we have data to show and snap is enabled
        if (data?.features?.length > 0 && this.map?.getLayer('snap-helper-circle')) {
          this.map.setLayoutProperty('snap-helper-circle', 'visibility', 'visible')
        }
        return result
      }
      MapboxSnap.prototype.__patchedSetMapData = true
    }
  }

  // Patch drawingSnapCheck to skip when snap is disabled
  if (!MapboxSnap.prototype.__patchedDrawingSnapCheck) {
    const originalDrawingSnapCheck = MapboxSnap.prototype.drawingSnapCheck
    if (originalDrawingSnapCheck) {
      MapboxSnap.prototype.drawingSnapCheck = function() {
        if (!this.status) return
        return originalDrawingSnapCheck.call(this)
      }
      MapboxSnap.prototype.__patchedDrawingSnapCheck = true
    }
  }

  // Completely disable changeSnappedPoints - we handle snap ourselves in drag handlers
  if (!MapboxSnap.prototype.__patchedChangeSnappedPoints) {
    MapboxSnap.prototype.changeSnappedPoints = function() {
      return
    }
    MapboxSnap.prototype.__patchedChangeSnappedPoints = true
  }

  const originalMethods = getOriginalMethods()

  // If we couldn't get original methods (hot reload after patching), remaining patches already applied
  if (!originalMethods) {
    return
  }

  // Patch getLines for MultiPolygon and MultiLineString typo (coodinates -> coordinates)
  if (!MapboxSnap.prototype.__patchedGetLines) {
    MapboxSnap.prototype.getLines = function(feature, mouse, radiusArg) {
      if (!feature.geometry) {
        return []
      }

      // Fix typo: original uses 'coodinates' instead of 'coordinates'
      if (feature.geometry.type === 'MultiPolygon') {
        const coords = feature.geometry.coordinates || []
        return coords.map(c => polygon(c))
      }

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
      // Skip when snap is disabled
      if (!this.status) {
        return []
      }
      
      // Filter options.layers to only those that exist in the maps style
      this.options.layers = layers.filter(layer => this.map.getLayer(layer))
      
      // bbox logic
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

  // Patch snapToClosestPoint to skip when disabled and clean up internal arrays (prevents memory accumulation)
  if (!MapboxSnap.prototype.__patchedSnapToClosestPoint) {
    MapboxSnap.prototype.snapToClosestPoint = function(e) {
      // Skip entirely when snap is disabled
      if (!this.status) {
        return
      }

      const result = originalMethods.snapToClosestPoint.call(this, e)

      // Clean up internal arrays in place to prevent memory accumulation
      if (this.closeFeatures?.length > 100) {
        this.closeFeatures.length = 0
      }
      if (this.lines?.length > 100) {
        this.lines.length = 0
      }

      return result
    }
    MapboxSnap.prototype.__patchedSnapToClosestPoint = true
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
  if (!source) {
    return
  }

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
  // Prevent multiple initializations (causes event listener duplication)
  if (map._snapInitialized) {
    return map._snapInstance
  }
  map._snapInitialized = true

  const {
    layers = [],
    radius = 15,
    rules = ['vertex', 'midpoint', 'edge'],
    status = false,
    onSnapped = () => {},
    colors = {}
  } = snapOptions

  // Apply global patches to MapboxSnap prototype
  applyMapboxSnapPatches(colors, layers)

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
    // Prevent duplicate creation (race condition between initial poll and style.load)
    if (map._snapInstance || map._snapCreating) {
      return map._snapInstance
    }

    console.log('New snap instance')
    map._snapCreating = true

    // Clean up any existing layer/source before creating new instance
    cleanupOldSnap()

    patchSourceData(source)

    const snap = new MapboxSnap({
      map,
      drawing: draw,
      options: { layers, radius, rules },
      status,
      onSnapped
    })

    // Override the status property to prevent library from auto-setting it
    // The library sets status=true on draw.modechange and draw.selectionchange
    // We want external control only via setSnapStatus()
    let controlledStatus = status
    Object.defineProperty(snap, 'status', {
      get() {
        return controlledStatus
      },
      set() {
        // Ignore the library's auto-set attempts - only allow via setSnapStatus()
      },
      configurable: true
    })

    // Provide a method for external control of status
    snap.setSnapStatus = (value) => {
      controlledStatus = value
    }

    map._snapInstance = snap

    return snap
  }

  // Handle style changes - re-patch source and ensure snap layer exists
  map.on('style.load', () => {
    console.log('style.load')
    pollUntil(
      () => map.getSource('mapbox-gl-draw-hot'),
      (source) => {
        // 1. Repair the Draw source reference
        patchSourceData(source)

        // Manually restore the Snap Source if it's gone
        if (!map.getSource('snap-helper-circle')) {
          map.addSource('snap-helper-circle', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          })
        }

        // 3. Manually restore the Snap Layer if it's gone
        if (!map.getLayer('snap-helper-circle')) {
          map.addLayer({
            id: 'snap-helper-circle',
            type: 'fill',
            source: 'snap-helper-circle',
            paint: {
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.6,
            },
            layout: {
              'visibility': map._snapInstance.status ? 'visible' : 'none'
            }
          })
        }
        
        if (!map._snapInstance) {
          cleanupOldSnap()
          createSnap(source)
        }
        // Note: If snap instance exists, the library will recreate its layer on next setMapData call
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
    // Only show indicator if snap is enabled
    const snap = map._snapInstance
    if (map.getLayer('snap-helper-circle') && snap?.status) {
      map.setLayoutProperty('snap-helper-circle', 'visibility', 'visible')
    }
  })

  // Initial setup - poll until draw source exists
  pollUntil(
    () => map.getSource('mapbox-gl-draw-hot'),
    createSnap
  )
}
