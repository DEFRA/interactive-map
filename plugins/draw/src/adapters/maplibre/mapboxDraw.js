import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { DisabledMode } from './modes/disabledMode.js'
import { EditVertexMode } from './modes/editVertexMode.js'
import { EditPointMode } from './modes/editPointMode.js'
import { DrawPolygonMode } from './modes/drawPolygonMode.js'
import { DrawLineMode } from './modes/drawLineMode.js'
import { DrawPointMode } from './modes/drawPointMode.js'
import { createDrawStyles, updateDrawStyles } from './styles.js'
import { initMapLibreSnap } from './mapboxSnap.js'
import { createUndoStack } from '../../utils/undoStack.js'
import { setupTouchClickWorkaround } from './utils/touchClickWorkaround.js'
import { applyTouchVertexColors } from './modes/editVertexMode/touchHandlers.js'
import { resolveColors } from '../../utils/resolveColors.js'
import { TOLERANCES, MAP_SIZE_SCALES } from './defaults.js'
import { refreshAllPointSymbols } from './pointSymbolImages.js'

// map.setStyle() discards MapLibre's entire previous Style, wiping every programmatically
// added source/layer/image — including mapbox-gl-draw's own, which it never re-adds itself.
// draw.options.styles already holds the fully processed cold+hot layer pairs, so re-adding
// needs no new computation.
const DRAW_SOURCES = { COLD: 'mapbox-gl-draw-cold', HOT: 'mapbox-gl-draw-hot' }

// Re-creates the (empty) sources/layers only — deliberately doesn't push draw.getAll() back
// in here. mapbox-gl-draw's own render() is requestAnimationFrame-debounced, so doing that
// too early would write each point's *previous* (not yet re-resolved) image ids into the
// fresh source, racing the correct write that refreshAllPointSymbols makes moments later.
// The caller pushes the final data back in exactly once, after that settles.
const ensureDrawSourcesAndLayers = (map, draw) => {
  if (map.getSource(DRAW_SOURCES.COLD)) {
    return false // survived (or already restored) — nothing to do
  }
  const empty = { type: 'FeatureCollection', features: [] }
  map.addSource(DRAW_SOURCES.COLD, { data: empty, type: 'geojson' })
  map.addSource(DRAW_SOURCES.HOT, { data: empty, type: 'geojson' })
  draw.options.styles.forEach(style => map.addLayer(style))
  return true
}

// Reacts to MAP_STYLE_CHANGE (fired off the native 'style.load' event, i.e. after setStyle()
// actually ran), not MAP_SET_STYLE (fired the instant a change is *requested*, before setStyle
// may have run) — registering map.once('idle', ...) too early can catch the map still idle
// from the *previous* style and consume itself before the real wipe happens.
const settleStyleChange = ({ map, draw, mapProvider, pluginConfig, onDone }) => {
  const mapStyle = map._drawCurrentMapStyle
  map.once('idle', () => {
    const sourcesWereMissing = ensureDrawSourcesAndLayers(map, draw)
    updateDrawStyles(map, mapStyle, pluginConfig)
    const svg = map._drawEditContainer?.querySelector('[data-im-draw-touch-target]')
    applyTouchVertexColors(svg, mapStyle, pluginConfig)
    // Rasterised point symbol images are style-scoped (colours resolve per map style) —
    // re-resolve every drawn point's icon now the new style has settled.
    refreshAllPointSymbols({ draw, mapProvider, map }).then(() => {
      if (sourcesWereMissing) {
        // draw's own feature store still holds everything; push it back now the new style's
        // image ids are resolved — exactly one write, with final data.
        draw.set(draw.getAll())
      }
      // The highlight ring is a standalone layer maintained outside mapbox-gl-draw's own
      // render cycle, so nothing guarantees MapLibre repaints it (or refreshes the hover
      // cursor's queryRenderedFeatures results) right after a style reload — force it.
      map.triggerRepaint()
      onDone()
    })
  })
}

// Wires MAP_SET_STYLE (stashes the incoming style) and MAP_STYLE_CHANGE (settles it) onto the
// event bus. Returns both handlers so createMapboxDraw's remove() can unsubscribe them.
const wireStyleChangeHandling = ({ map, draw, mapProvider, pluginConfig, eventBus, events, notifyPointSymbolsRefreshed }) => {
  const handleSetMapStyle = (e) => {
    map._drawCurrentMapStyle = e
  }
  eventBus.on(events.MAP_SET_STYLE, handleSetMapStyle)

  // MAP_STYLE_CHANGE fires twice per style change (two separate 'style.load' listeners
  // elsewhere in the app) — this guard stops settleStyleChange's expensive work running twice.
  let settlePending = false
  const handleStyleChanged = () => {
    if (settlePending) {
      return
    }
    settlePending = true
    settleStyleChange({
      map,
      draw,
      mapProvider,
      pluginConfig,
      onDone: () => {
        settlePending = false
        notifyPointSymbolsRefreshed()
      }
    })
  }
  eventBus.on(events.MAP_STYLE_CHANGE, handleStyleChanged)

  return { handleSetMapStyle, handleStyleChanged }
}

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
 * @param {Object} [options.pluginConfig] - Plugin-level colour/size overrides — see resolveColors()
 * @returns {{ draw: MapboxDraw, remove: Function }} draw instance and cleanup function
 */
export const createMapboxDraw = ({ mapStyle, mapProvider, events, eventBus, snapLayers, pluginConfig = {} }) => {
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
    edit_point: EditPointMode,
    draw_polygon: DrawPolygonMode,
    draw_line: DrawLineMode,
    draw_point: DrawPointMode
  }

  // --- Create or reuse MapLibre Draw instance ---
  let draw = mapProvider._mapboxDrawInstance
  if (draw) {
    // Update modes on existing draw instance when adapter is recreated
    Object.assign(draw.modes, modes)
  } else {
    draw = new MapboxDraw({
      modes,
      styles: createDrawStyles(mapStyle, pluginConfig),
      displayControlsDefault: false,
      userProperties: true,
      defaultMode: 'disabled'
    })
    map.addControl(draw)
    mapProvider._mapboxDrawInstance = draw
  }

  // mapbox-gl-draw swallows tap clicks in disabled mode — synthesize them
  const touchClickWorkaround = setupTouchClickWorkaround(map, draw)

  // We need a reference to this
  mapProvider.draw = draw
  map._drawCurrentMapStyle = mapStyle
  // Stashed on the map so mode code with only `this.map` can resolve colour overrides.
  map._drawPluginConfig = pluginConfig
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
  const snapColors = resolveColors(mapStyle, pluginConfig)
  initMapLibreSnap(map, draw, {
    layers: snapLayers,
    radius: pluginConfig.snapRadius ?? TOLERANCES.snapRadius,
    rules: ['vertex', 'edge'],
    colors: { vertex: snapColors.snapVertex, edge: snapColors.snapEdge }
  })

  // Nudges plugins/interact's useHighlightSync to re-apply highlights once point symbols
  // have actually finished re-resolving, rather than relying on a side-effect event.
  const notifyPointSymbolsRefreshed = () => eventBus.emit(events.MAP_DATA_CHANGE)

  // --- Update colour scheme ---
  const { handleSetMapStyle, handleStyleChanged } = wireStyleChangeHandling({
    map, draw, mapProvider, pluginConfig, eventBus, events, notifyPointSymbolsRefreshed
  })

  // --- Update map scale ---
  const handleSetMapSize = (e) => {
    map.fire('draw.scalechange', { scale: MAP_SIZE_SCALES[e] })
  }
  eventBus.on(events.MAP_SET_SIZE, handleSetMapSize)

  // --- Update point symbol resolution for the new pixel ratio ---
  // MAP_SET_PIXEL_RATIO carries the freshly computed pixel ratio itself, fired right after
  // MAP_SET_SIZE — that's the value this needs, not map.getPixelRatio() (unchanged since init).
  const handleSetPixelRatio = (pixelRatio) => {
    refreshAllPointSymbols({ draw, mapProvider, map, pixelRatioOverride: pixelRatio }).then(() => {
      map.triggerRepaint()
      notifyPointSymbolsRefreshed()
    })
  }
  eventBus.on(events.MAP_SET_PIXEL_RATIO, handleSetPixelRatio)

  // --- Return instance and cleanup function ---
  return {
    draw,
    remove () {
      touchClickWorkaround.remove()
      // Remove event listeners
      eventBus.off(events.MAP_SET_STYLE, handleSetMapStyle)
      eventBus.off(events.MAP_STYLE_CHANGE, handleStyleChanged)
      eventBus.off(events.MAP_SET_SIZE, handleSetMapSize)
      eventBus.off(events.MAP_SET_PIXEL_RATIO, handleSetPixelRatio)
      // Disable draw mode but keep control on map for reuse
      draw.changeMode('disabled')
      // Clear adapter reference (but not _mapboxDrawInstance so it persists)
      mapProvider.draw = null
    }
  }
}
