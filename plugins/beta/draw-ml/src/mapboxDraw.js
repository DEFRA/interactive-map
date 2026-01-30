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
 * @param {string} options.mapStyle - Map style object
 * @param {Object} options.mapProvider - Object containing the map instance
 * @param {Object} options.eventBus - Event bus for app-level events
 * @returns {{ draw: MapboxDraw, remove: Function }} draw instance and cleanup function
 */
export const createMapboxDraw = ({ mapStyle, mapProvider, events, eventBus, snapLayers }) => {
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
    styles: createDrawStyles(mapStyle),
    displayControlsDefault: false,
    userProperties: true,
    defaultMode: 'disabled'
  })
  map.addControl(draw)

  // Workaround: mapbox-gl-draw calls preventDefault() on touchend even in disabled mode,
  // which prevents the browser from synthesizing a click event. We detect taps and
  // manually dispatch a click event when in disabled mode.
  const canvas = map.getCanvas()
  let touchStart = null

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() }
    }
  }

  const handleTouchEnd = (e) => {
    if (draw.getMode() !== 'disabled' || !touchStart) {
      touchStart = null
      return
    }

    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStart.x
    const dy = touch.clientY - touchStart.y
    const duration = Date.now() - touchStart.time

    // Only synthesize click for quick taps with minimal movement
    if (duration < 300 && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      canvas.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: touch.clientX,
        clientY: touch.clientY
      }))
    }

    touchStart = null
  }

  canvas.addEventListener('touchstart', handleTouchStart, { passive: true })
  canvas.addEventListener('touchend', handleTouchEnd, { passive: true })

  // We need a reference to this
  mapProvider.draw = draw
  // Initialize snap as disabled (matches initialState.snap = false)
  mapProvider.snapEnabled = false

  // --- Initialize MapboxSnap using external module ---
  // Start with status: false to match initial snap disabled state
  initMapLibreSnap(map, draw, {
    layers: snapLayers,
    radius: 10,
    rules: ['vertex', 'edge']
  })

  // --- Update colour scheme ---
  const handleSetMapStyle = (e) => {
    map.once('idle', () => {
      updateDrawStyles(map, e)
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
      // Remove touch workaround listeners
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchend', handleTouchEnd)
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
