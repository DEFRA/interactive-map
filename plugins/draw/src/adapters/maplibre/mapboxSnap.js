import { COLORS, TOLERANCES } from './defaults.js'
import { applyMapboxSnapPatches } from './snap/prototypePatches.js'
import { pollUntil } from './snap/sourceData.js'
import { createSnapInstance } from './snap/snapInstance.js'
import { registerStyleLoadHandler, registerZoomHandlers } from './snap/mapHandlers.js'
import { DRAW_HOT_SOURCE } from './snap/constants.js'

/** Initialize MapboxSnap with MapLibre + MapboxDraw */
export function initMapLibreSnap (map, draw, snapOptions = {}) {
  // Prevent multiple initializations (causes event listener duplication)
  if (map._snapInitialized) {
    return map._snapInstance
  }
  map._snapInitialized = true

  const {
    layers = [],
    radius = TOLERANCES.snapRadius,
    rules = ['vertex', 'midpoint', 'edge'],
    status = false,
    onSnapped = () => {},
    colors = {}
  } = snapOptions
  const config = { layers, radius, rules, status, onSnapped }

  // Apply global patches to the MapboxSnap prototype
  applyMapboxSnapPatches({ vertex: COLORS.snapVertex, midpoint: COLORS.snapMidpoint, edge: COLORS.snapEdge, ...colors })

  registerStyleLoadHandler(map, draw, config)
  registerZoomHandlers(map)

  // Initial setup - poll until the draw source exists
  pollUntil(
    () => map._removed ? null : map.getSource(DRAW_HOT_SOURCE),
    (source) => createSnapInstance(map, draw, source, config)
  )

  return map._snapInstance
}
