import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { DisabledMode } from './modes/disabledMode.js'
import { EditVertexMode } from './modes/editVertexMode.js'
import { DrawPolygonMode } from './modes/drawPolygonMode.js'
import { DrawLineMode } from './modes/drawLineMode.js'
import { createDrawStyles, updateDrawStyles } from './styles.js'
import { initMapLibreSnap } from './mapboxSnap.js'
import { createUndoStack } from '../../utils/undoStack.js'
import { setupCursorIndicator } from './utils/cursorIndicator.js'
import { setupTouchClickWorkaround } from './utils/touchClickWorkaround.js'
import { applyTouchVertexColors } from './modes/editVertex/touchHandlers.js'
import { TOLERANCES, MAP_SIZE_SCALES } from './defaults.js'

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
    draw_polygon: DrawPolygonMode,
    draw_line: DrawLineMode
  }

  // --- Create or reuse MapLibre Draw instance ---
  let draw = mapProvider._mapboxDrawInstance
  if (!draw) {
    draw = new MapboxDraw({
      modes,
      styles: createDrawStyles(mapStyle),
      displayControlsDefault: false,
      userProperties: true,
      defaultMode: 'disabled'
    })
    map.addControl(draw)
    mapProvider._mapboxDrawInstance = draw
  } else {
    // Update modes on existing draw instance when adapter is recreated
    Object.assign(draw.modes, modes)
  }

  // mapbox-gl-draw swallows tap clicks in disabled mode — synthesize them
  const touchClickWorkaround = setupTouchClickWorkaround(map, draw)

  // We need a reference to this
  mapProvider.draw = draw
  map._drawCurrentMapStyle = mapStyle
  // Initialize snap as disabled (matches initialState.snap = false)
  mapProvider.snapEnabled = false
  // Initialize undo stack (reuse if already exists)
  let undoStack = mapProvider.undoStack
  if (!undoStack) {
    undoStack = createUndoStack((length) => map.fire('draw.undochange', { length }))
    mapProvider.undoStack = undoStack
  }
  map._undoStack = undoStack

  // --- Initialize MapboxSnap using external module ---
  // Start with status: false to match initial snap disabled state
  initMapLibreSnap(map, draw, {
    layers: snapLayers,
    radius: TOLERANCES.snapRadius,
    rules: ['vertex', 'edge']
  })

  // --- Mouse cursor indicator during draw modes ---
  const cursorIndicator = setupCursorIndicator(map, draw)

  // --- Update colour scheme ---
  const handleSetMapStyle = (e) => {
    map._drawCurrentMapStyle = e
    map.once('idle', () => {
      updateDrawStyles(map, e)
      cursorIndicator.refreshColors()
      const svg = map._drawEditContainer?.querySelector('[data-im-draw-touch-target]')
      applyTouchVertexColors(svg, e)
    })
  }
  eventBus.on(events.MAP_SET_STYLE, handleSetMapStyle)

  // --- Sync final interface type when exiting draw modes ---
  // When user switches devices during drawing (e.g., mouse to keyboard), the draw
  // mode's local interfaceType diverges from appState.interfaceType. When exiting
  // draw mode, we emit the final interfaceType so appState can be updated.
  const handleDrawInterfaceTypeChange = (e) => {
    eventBus.emit('draw:interfacetypechange', { interfaceType: e.interfaceType })
  }
  map.on('draw.interfacetypechange', handleDrawInterfaceTypeChange)

  // --- Update map scale ---
  const handleSetMapSize = (e) => {
    map.fire('draw.scalechange', { scale: MAP_SIZE_SCALES[e] })
  }
  eventBus.on(events.MAP_SET_SIZE, handleSetMapSize)

  // --- Return instance and cleanup function ---
  return {
    draw,
    remove () {
      touchClickWorkaround.remove()
      // Remove event listeners
      eventBus.off(events.MAP_SET_STYLE, handleSetMapStyle)
      eventBus.off(events.MAP_SET_SIZE, handleSetMapSize)
      map.off('draw.interfacetypechange', handleDrawInterfaceTypeChange)
      // Disable draw mode but keep control on map for reuse
      draw.changeMode('disabled')
      // Unwrap changeMode so wrappers don't stack when the adapter is recreated
      cursorIndicator.remove()
      // Clear adapter reference (but not _mapboxDrawInstance so it persists)
      mapProvider.draw = null
    }
  }
}
