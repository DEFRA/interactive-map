import MapboxSnap from 'mapbox-gl-snap/dist/esm/MapboxSnap.js'
import { patchSourceData } from './sourceData.js'
import { SNAP_HELPER_LAYER } from './constants.js'

/** Remove any stale snap helper source/layer before creating a new instance */
function cleanupOldSnap (map) {
  if (map.getLayer(SNAP_HELPER_LAYER)) {
    map.removeLayer(SNAP_HELPER_LAYER)
  }
  if (map.getSource(SNAP_HELPER_LAYER)) {
    map.removeSource(SNAP_HELPER_LAYER)
  }
}

// Snap indicators (and all snap processing) are only meaningful while actively
// drawing or editing vertices — outside these modes there is nothing to snap to.
const SNAP_ACTIVE_MODES = new Set(['draw_polygon', 'draw_line', 'edit_vertex'])

/**
 * Externally-controlled status: ignore library writes so status is only changed
 * via setSnapStatus(). The library otherwise sets status=true on mode/selection change.
 *
 * Also gated on the current draw mode: the library's own mousemove listener
 * (added once in its constructor) calls snapToClosestPoint on every mouse move
 * regardless of draw mode, repainting the snap-helper-circle layer whenever
 * status is true. Without this gate, the marker reappears on the very next
 * mouse move after leaving draw/edit mode, since mapbox-gl-draw's public
 * changeMode API is silent by default and rarely gives us a mode-change event
 * to react to.
 */
function defineControlledStatus (snap, initialStatus, draw) {
  let controlledStatus = initialStatus

  Object.defineProperty(snap, 'status', {
    get () { // nosonar
      return controlledStatus && SNAP_ACTIVE_MODES.has(draw.getMode())
    },
    set () { // nosonar
      // intentionally empty: library writes are ignored
    },
    configurable: true
  })

  snap.setSnapStatus = (value) => {
    controlledStatus = value
  }
}

/** Store default snap layers and expose a per-call override setter (null resets) */
function configureSnapLayers (snap, layers) {
  snap._defaultLayers = layers
  snap._activeLayers = null

  snap.setSnapLayers = (overrideLayers) => {
    if (overrideLayers === null || overrideLayers === undefined) {
      snap._activeLayers = null // Use defaults
    } else if (Array.isArray(overrideLayers)) {
      snap._activeLayers = overrideLayers // Override defaults
    } else {
      // No action
    }
  }
}

/** Create the snap instance once the draw source is available */
export function createSnapInstance (map, draw, source, config) {
  // Prevent duplicate creation (race between initial poll and style.load)
  if (map._snapInstance || map._snapCreating) {
    return map._snapInstance
  }

  map._snapCreating = true
  cleanupOldSnap(map)
  patchSourceData(source)

  /** @type {any} */
  const snap = new MapboxSnap({
    map,
    drawing: draw,
    options: { layers: config.layers, radius: config.radius, rules: config.rules },
    status: config.status,
    onSnapped: config.onSnapped
  })

  defineControlledStatus(snap, config.status, draw)
  configureSnapLayers(snap, config.layers)

  // Apply any pending snap layers that were set before the instance was ready
  if (map._pendingSnapLayers !== undefined) {
    snap.setSnapLayers(map._pendingSnapLayers)
    delete map._pendingSnapLayers
  }

  map._snapInstance = snap
  return snap
}

/** Ensure the snap helper source and layer exist after a style change */
export function ensureSnapLayer (map) {
  if (!map.getSource(SNAP_HELPER_LAYER)) {
    map.addSource(SNAP_HELPER_LAYER, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    })
  }
  if (!map.getLayer(SNAP_HELPER_LAYER)) {
    map.addLayer({
      id: SNAP_HELPER_LAYER,
      type: 'fill',
      source: SNAP_HELPER_LAYER,
      paint: { 'fill-color': ['get', 'color'] },
      layout: { visibility: map._snapInstance?.status ? 'visible' : 'none' }
    })
  }
}
