import { pollUntil, patchSourceData } from './sourceData.js'
import { createSnapInstance, ensureSnapLayer } from './snapInstance.js'
import { SNAP_HELPER_LAYER, DRAW_HOT_SOURCE } from './constants.js'

/** Re-patch the source and restore the snap layer whenever the style reloads */
export function registerStyleLoadHandler (map, draw, config) {
  map.on('style.load', () => {
    pollUntil(
      () => map._removed ? null : map.getSource(DRAW_HOT_SOURCE),
      (source) => {
        patchSourceData(source)
        ensureSnapLayer(map)
        if (!map._snapInstance) {
          createSnapInstance(map, draw, source, config)
        }
      }
    )
  })
}

/** Suppress snap processing during zoom and reset the indicator afterwards */
export function registerZoomHandlers (map) {
  // Suppress snap processing during zoom (indicator freezes in place)
  map.on('zoomstart', () => {
    map._isZooming = true
  })

  map.on('zoomend', () => {
    map._isZooming = false
    // Force hide then re-show to reset indicator at new zoom level (Safari fix)
    if (map.getLayer(SNAP_HELPER_LAYER)) {
      map.setLayoutProperty(SNAP_HELPER_LAYER, 'visibility', 'none')
      const snap = map._snapInstance
      if (snap?.status) {
        map.setLayoutProperty(SNAP_HELPER_LAYER, 'visibility', 'visible')
      }
    }
  })
}
