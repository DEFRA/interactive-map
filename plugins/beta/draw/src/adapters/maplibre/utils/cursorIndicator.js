import { getValueForStyle } from '../../../utils/getValueForStyle.js'
import { COLORS, SIZES } from '../defaults.js'

const CURSOR_SOURCE = 'draw-cursor-indicator'
const CURSOR_LAYER = 'draw-cursor-indicator-layer'
const EMPTY_FC = { type: 'FeatureCollection', features: [] }
const DRAW_MODES = new Set(['draw_polygon', 'draw_line'])

/**
 * Small filled circle that follows the mouse pointer during draw modes, showing
 * where the next vertex will be placed (matches the OL sketch point behaviour).
 *
 * Wraps draw.changeMode to activate/deactivate with mode changes. Reads the live
 * map style (map._drawCurrentMapStyle) so colours stay correct after style
 * switches, and recreates its source/layer on draw-mode entry since a style
 * switch wipes custom sources and layers.
 *
 * @param {Object} map - MapLibre map instance
 * @param {Object} draw - MapboxDraw instance (its changeMode is wrapped)
 * @returns {{ refreshColors: Function, remove: Function }}
 */
export const setupCursorIndicator = (map, draw) => {
  const paintColors = () => {
    const style = map._drawCurrentMapStyle
    const scheme = style?.mapColorScheme ?? 'light'
    return {
      'circle-color': getValueForStyle(COLORS.mousePointer, scheme, style?.id),
      'circle-stroke-color': getValueForStyle(COLORS.mousePointerHalo, scheme, style?.id)
    }
  }

  const ensureLayer = () => {
    if (!map.getSource(CURSOR_SOURCE)) {
      map.addSource(CURSOR_SOURCE, { type: 'geojson', data: EMPTY_FC })
    }
    if (!map.getLayer(CURSOR_LAYER)) {
      map.addLayer({
        id: CURSOR_LAYER,
        type: 'circle',
        source: CURSOR_SOURCE,
        paint: {
          'circle-radius': SIZES.mousePointerRadius,
          'circle-stroke-width': 1,
          ...paintColors()
        }
      })
    }
  }

  let active = false
  const onMouseMove = (e) => {
    if (!active) {
      return
    }
    map.getSource(CURSOR_SOURCE)?.setData({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [e.lngLat.lng, e.lngLat.lat] }
      }]
    })
  }

  const originalChangeMode = draw.changeMode.bind(draw)
  draw.changeMode = (mode, opts) => {
    active = DRAW_MODES.has(mode)
    map.off('mousemove', onMouseMove)
    if (active) {
      ensureLayer()
      map.on('mousemove', onMouseMove)
    } else {
      map.getSource(CURSOR_SOURCE)?.setData(EMPTY_FC)
    }
    return originalChangeMode(mode, opts)
  }

  return {
    // Re-apply colours after a map style change
    refreshColors () {
      if (map.getLayer(CURSOR_LAYER)) {
        Object.entries(paintColors()).forEach(([prop, value]) => map.setPaintProperty(CURSOR_LAYER, prop, value))
      }
    },

    // Restores the original changeMode so wrappers don't stack when the
    // adapter is recreated against the persistent MapboxDraw instance
    remove () {
      map.off('mousemove', onMouseMove)
      draw.changeMode = originalChangeMode
    }
  }
}
