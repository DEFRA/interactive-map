import MapboxSnap from 'mapbox-gl-snap/dist/esm/MapboxSnap.js'
import { polygon, lineString } from '@turf/helpers'
import { DEFAULTS } from './defaults.js'

/** Apply patches to MapboxSnap prototype (once only) */
function applyMapboxSnapPatches(colors) {
  if (MapboxSnap.prototype.__snapPatched) {
    return
  }
  MapboxSnap.prototype.__snapPatched = true

  const proto = MapboxSnap.prototype
  const orig = {
    setMapData: proto.setMapData,
    drawingSnapCheck: proto.drawingSnapCheck,
    getLines: proto.getLines,
    getCloseFeatures: proto.getCloseFeatures,
    searchInVertex: proto.searchInVertex,
    searchInMidPoint: proto.searchInMidPoint,
    searchInEdge: proto.searchInEdge,
    snapToClosestPoint: proto.snapToClosestPoint
  }

  // Disable changeSnappedPoints - we handle snap ourselves in drag handlers
  proto.changeSnappedPoints = () => {}

  // Skip setMapData when disabled, ensure layer visibility when enabled
  proto.setMapData = function(data) {
    if (!this.status) {
      return
    }
    const result = orig.setMapData.call(this, data)
    if (data?.features?.length > 0 && this.map?.getLayer('snap-helper-circle')) {
      this.map.setLayoutProperty('snap-helper-circle', 'visibility', 'visible')
    }
    return result
  }

  // Skip drawingSnapCheck when disabled
  proto.drawingSnapCheck = function() {
    if (!this.status) {
      return
    }
    return orig.drawingSnapCheck.call(this)
  }

  // Fix typo: original uses 'coodinates' instead of 'coordinates' for Multi* types
  // Also validate coordinates to prevent "coordinates must contain numbers" errors
  proto.getLines = function(feature, mouse, radiusArg) {
    const geom = feature.geometry
    if (!geom || !geom.coordinates) {
      return []
    }
    const coords = geom.coordinates
    // Validate that we have actual coordinate arrays
    if (!Array.isArray(coords) || coords.length === 0) {
      return []
    }
    try {
      if (geom.type === 'MultiPolygon') {
        return coords.filter(c => Array.isArray(c) && c.length > 0).map(c => polygon(c))
      }
      if (geom.type === 'MultiLineString') {
        return coords.filter(c => Array.isArray(c) && c.length > 0).map(c => lineString(c))
      }
      return orig.getLines.call(this, feature, mouse, radiusArg)
    } catch (e) {
      // Invalid geometry - skip this feature
      return []
    }
  }

  // Query within radius bbox instead of just point, filter to existing layers
  proto.getCloseFeatures = function(e, radiusInMeters) {
    if (!this.status) {
      return []
    }
    // Use active layers (per-call override) or fall back to default layers
    const activeLayers = this._activeLayers || this._defaultLayers || []
    this.options.layers = activeLayers.filter(l => this.map.getLayer(l))
    const r = this.options.radius || 15
    const origPt = e.point
    e.point = [[origPt.x - r, origPt.y - r], [origPt.x + r, origPt.y + r]]
    const result = orig.getCloseFeatures.call(this, e, radiusInMeters)
    e.point = origPt
    return result
  }

  // Custom colors for snap indicators
  proto.searchInVertex = function(...args) {
    const r = orig.searchInVertex.apply(this, args)
    if (r) {
      r.color = colors.vertex
    }
    return r
  }
  proto.searchInMidPoint = function(...args) {
    const r = orig.searchInMidPoint.apply(this, args)
    if (r) {
      r.color = colors.midpoint
    }
    return r
  }
  proto.searchInEdge = function(...args) {
    const r = orig.searchInEdge.apply(this, args)
    if (r) {
      r.color = colors.edge
    }
    return r
  }

  // Skip when disabled, clean up internal arrays to prevent memory accumulation
  proto.snapToClosestPoint = function(e) {
    if (!this.status) {
      return
    }
    try {
      const result = orig.snapToClosestPoint.call(this, e)
      if (this.closeFeatures?.length > 100) {
        this.closeFeatures.length = 0
      }
      if (this.lines?.length > 100) {
        this.lines.length = 0
      }
      return result
    } catch (err) {
      // Invalid geometry encountered - clear state and continue
      this.snapStatus = false
      this.snapCoords = null
      return
    }
  }
}

/** Poll until checkFn returns truthy, then call onSuccess with the result */
function pollUntil(checkFn, onSuccess) {
  (function poll() {
    const result = checkFn()
    result ? onSuccess(result) : requestAnimationFrame(poll)
  })()
}

/**
 * Patch a GeoJSON source to expose _data for MapboxSnap compatibility
 * MapboxSnap expects source._data.features but MapLibre doesn't expose this
 */
export function patchSourceData(source) {
  if (!source || (source._data && Array.isArray(source._data?.features))) {
    return
  }

  let dataCache = { type: 'FeatureCollection', features: [] }
  Object.defineProperty(source, '_data', {
    get: () => dataCache,
    set: (val) => {
      dataCache = (val && typeof val === 'object' && Array.isArray(val.features))
        ? val
        : { type: 'FeatureCollection', features: [] }
    },
    configurable: true
  })
}

/** Initialize MapboxSnap with MapLibre + MapboxDraw */
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
  applyMapboxSnapPatches({ ...DEFAULTS.snapColors, ...colors })

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

    // Store default layers and provide method to override per-call
    snap._defaultLayers = layers
    snap._activeLayers = null

    // Set snap layers (overrides defaults, pass null to reset to defaults)
    snap.setSnapLayers = (overrideLayers) => {
      if (overrideLayers === null || overrideLayers === undefined) {
        snap._activeLayers = null  // Use defaults
      } else if (Array.isArray(overrideLayers)) {
        snap._activeLayers = overrideLayers  // Override defaults
      }
    }

    // Apply any pending snap layers that were set before instance was ready
    if (map._pendingSnapLayers !== undefined) {
      snap.setSnapLayers(map._pendingSnapLayers)
      delete map._pendingSnapLayers
    }

    map._snapInstance = snap

    return snap
  }

  // Handle style changes - re-patch source and ensure snap layer exists
  map.on('style.load', () => {
    pollUntil(
      () => map.getSource('mapbox-gl-draw-hot'),
      (source) => {
        patchSourceData(source)

        // Restore snap source/layer if gone after style change
        if (!map.getSource('snap-helper-circle')) {
          map.addSource('snap-helper-circle', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          })
        }
        if (!map.getLayer('snap-helper-circle')) {
          map.addLayer({
            id: 'snap-helper-circle',
            type: 'fill',
            source: 'snap-helper-circle',
            paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.6 },
            layout: { visibility: map._snapInstance?.status ? 'visible' : 'none' }
          })
        }

        if (!map._snapInstance) {
          createSnap(source)
        }
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
