import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { DisabledMode } from './modes/disabledMode.js'
import { EditVertexMode } from './modes/editVertexMode.js'
import { DrawVertexMode } from './modes/drawVertexMode.js'
import { createDrawStyles, updateDrawStyles } from './styles.js'
import { initMapLibreSnap } from './mapboxSnap.js'

/**
 * Creates and manages a MapLibre/Mapbox Draw control instance configured for polygon editing.
 * Returns an object with a `.remove()` cleanup function that removes all listeners
 * and safely disposes of the Draw control.
 *
 * Features:
 * - Custom modes for editing and drawing vertices
 * - Dynamic runtime style updates on `events.MAP_SET_STYLE` event
 * - Safe reapplication of styles if map.setStyle is called
 *
 * @param {string} options.colorScheme - Color scheme name used for styles
 * @param {Object} options.mapProvider - Object containing the map instance
 * @param {Object} options.eventBus - Event bus for app-level events
 * @returns {{ draw: MapboxDraw, remove: Function }} draw instance and cleanup function
 */
export const createMapboxDraw = ({ colorScheme, mapProvider, events, eventBus }) => {
  const { map } = mapProvider

  // --- Configure MapLibre GL Draw CSS classes ---
  MapboxDraw.constants.classes.CONTROL_BASE = 'maplibregl-ctrl'
  MapboxDraw.constants.classes.CONTROL_PREFIX = 'maplibregl-ctrl-'
  MapboxDraw.constants.classes.CONTROL_GROUP = 'maplibregl-ctrl-group'

  // --- Register custom modes ---
  const modes = {
    ...MapboxDraw.modes,
    disabled: DisabledMode,
    edit_vertex: EditVertexMode,
    draw_vertex: DrawVertexMode
  }

  // --- Create MapLibre Draw instance ---
  const draw = new MapboxDraw({
    modes,
    styles: createDrawStyles(colorScheme),
    displayControlsDefault: false,
    userProperties: true,
    defaultMode: 'disabled'
  })
  map.addControl(draw)

  // We need a reference to this
  mapProvider.draw = draw

  // --- Initialize MapboxSnap using external module ---
  initMapLibreSnap(map, draw, {
    layers: ['OS/TopographicLine/Building Outline'],
    radius: 10,
    rules: ['vertex', 'edge']
  })

  // --- Update colour scheme ---
  const handleSetMapStyle = (e) => {
    map.once('idle', () => {
      updateDrawStyles(map, e.mapColorScheme)
    })
  }
  eventBus.on(events.MAP_SET_STYLE, handleSetMapStyle)

  // --- Update map scale ---
  const handleSetMapSize = (e) => {
    map.fire('draw.scalechange', { scale: { small: 1, medium: 1.5, large: 2 }[e] })
  }
  eventBus.on(events.MAP_SET_SIZE, handleSetMapSize)

  // --- Return instance and cleanup function ---
  return {
    draw,
    remove() {
      // Remove event listeners
      eventBus.off(events.MAP_SET_STYLE, handleSetMapStyle)
      // Delete all features and disable draw
      draw.deleteAll()
      draw.changeMode('disabled')
      // Remove draw control from map
      map.removeControl(draw)
    }
  }
}
