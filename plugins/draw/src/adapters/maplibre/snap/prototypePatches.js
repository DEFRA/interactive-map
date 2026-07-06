import MapboxSnap from 'mapbox-gl-snap/dist/esm/MapboxSnap.js'
import { polygon, lineString } from '@turf/helpers'
import { TOLERANCES } from '../defaults.js'
import { SNAP_HELPER_LAYER } from './constants.js'

const MAX_SNAP_FEATURE_CACHE = 100

// Skip setMapData/drawingSnapCheck when disabled; ensure layer visibility when enabled
function patchDataMethods (proto, orig) {
  proto.setMapData = function (data) {
    if (!this.status) {
      return undefined
    }
    const result = orig.setMapData.call(this, data)
    if (data?.features?.length > 0 && this.map?.getLayer(SNAP_HELPER_LAYER)) {
      this.map.setLayoutProperty(SNAP_HELPER_LAYER, 'visibility', 'visible')
    }
    return result
  }

  // Skip drawingSnapCheck when disabled
  proto.drawingSnapCheck = function () {
    if (!this.status) {
      return undefined
    }
    return orig.drawingSnapCheck.call(this)
  }
}

// Fix typo ('coodinates') and validate coordinates; query within a radius bbox
function patchGeometryMethods (proto, orig) {
  proto.getLines = function (feature, mouse, radiusArg) {
    const geom = feature.geometry
    if (!geom?.coordinates) {
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
      console.log(e)
      return []
    }
  }

  // Query within radius bbox instead of just point, filter to existing layers
  proto.getCloseFeatures = function (e, radiusInMeters) {
    if (!this.status) {
      return []
    }
    // Use active layers (per-call override) or fall back to default layers
    const activeLayers = this._activeLayers || this._defaultLayers || []
    this.options.layers = activeLayers.filter(l => this.map.getLayer(l))
    const r = this.options.radius || TOLERANCES.snapRadius
    const origPt = e.point
    e.point = [[origPt.x - r, origPt.y - r], [origPt.x + r, origPt.y + r]]
    const result = orig.getCloseFeatures.call(this, e, radiusInMeters)
    e.point = origPt
    return result
  }
}

// Custom colors for snap indicators
function patchColorMethods (proto, orig, colors) {
  proto.searchInVertex = function (...args) {
    const r = orig.searchInVertex.apply(this, args)
    if (r) {
      r.color = colors.vertex
    }
    return r
  }
  proto.searchInMidPoint = function (...args) {
    const r = orig.searchInMidPoint.apply(this, args)
    if (r) {
      r.color = colors.midpoint
    }
    return r
  }
  proto.searchInEdge = function (...args) {
    const r = orig.searchInEdge.apply(this, args)
    if (r) {
      r.color = colors.edge
    }
    return r
  }
}

// Skip when disabled or zooming; clean up internal arrays to prevent memory accumulation
function patchSnapMethod (proto, orig) {
  proto.snapToClosestPoint = function (e) {
    if (!this.status || this.map?._isZooming) {
      return undefined
    }
    try {
      const result = orig.snapToClosestPoint.call(this, e)
      if (this.closeFeatures?.length > MAX_SNAP_FEATURE_CACHE) {
        this.closeFeatures.length = 0
      }
      if (this.lines?.length > MAX_SNAP_FEATURE_CACHE) {
        this.lines.length = 0
      }
      return result
    } catch (err) {
      // Invalid geometry encountered - clear state and continue
      console.log(err)
      this.snapStatus = false
      this.snapCoords = null
      return undefined
    }
  }
}

/** Apply patches to MapboxSnap prototype (once only) */
export function applyMapboxSnapPatches (colors) {
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

  patchDataMethods(proto, orig)
  patchGeometryMethods(proto, orig)
  patchColorMethods(proto, orig, colors)
  patchSnapMethod(proto, orig)
}
