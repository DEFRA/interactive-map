import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { createDrawStyles, updateDrawStyles } from './styles.js'
import { initMapLibreSnap } from './mapboxSnap.js'
import { createUndoStack } from '../../utils/undoStack.js'
import { setupTouchClickWorkaround } from './utils/touchClickWorkaround.js'
import { applyTouchVertexColors } from './modes/editVertexMode/touchHandlers.js'
import { resolveColors } from '../../utils/resolveColors.js'
import { TOLERANCES, MAP_SIZE_SCALES } from './defaults.js'
import { refreshAllPointSymbols } from './pointSymbolImages.js'
import { createMapboxDraw } from './mapboxDraw.js'

jest.mock('@mapbox/mapbox-gl-draw', () => {
  const MockDraw = jest.fn(function () {
    this.modes = {}
    this.changeMode = jest.fn()
    // Mirrors mapbox-gl-draw's own index.js: `api.options = options` — the fully-processed
    // (cold+hot-duplicated) styles array survives on the public instance regardless of any
    // later map.setStyle() wiping the actual map layers built from it.
    this.options = { styles: [{ id: 'fill-inactive.cold' }, { id: 'fill-inactive.hot' }] }
    this.set = jest.fn()
    this.getAll = jest.fn(() => ({ type: 'FeatureCollection', features: [{ type: 'Feature', id: 'f1' }] }))
  })
  MockDraw.constants = { classes: {} }
  MockDraw.modes = { existing_mode: { id: 'existing' } }
  return { __esModule: true, default: MockDraw }
})

jest.mock('./modes/disabledMode.js', () => ({ DisabledMode: { id: 'disabled' } }))
jest.mock('./modes/editVertexMode.js', () => ({ EditVertexMode: { id: 'edit_vertex' } }))
jest.mock('./modes/drawPolygonMode.js', () => ({ DrawPolygonMode: { id: 'draw_polygon' } }))
jest.mock('./modes/drawLineMode.js', () => ({ DrawLineMode: { id: 'draw_line' } }))
jest.mock('./modes/drawPointMode.js', () => ({ DrawPointMode: { id: 'draw_point' } }))
jest.mock('./pointSymbolImages.js', () => ({ refreshAllPointSymbols: jest.fn(() => Promise.resolve()) }))
jest.mock('./styles.js', () => ({
  createDrawStyles: jest.fn(() => ['style']),
  updateDrawStyles: jest.fn()
}))
jest.mock('./mapboxSnap.js', () => ({ initMapLibreSnap: jest.fn() }))
jest.mock('../../utils/undoStack.js', () => ({ createUndoStack: jest.fn(() => ({ id: 'undo-stack' })) }))
jest.mock('./utils/touchClickWorkaround.js', () => ({ setupTouchClickWorkaround: jest.fn() }))
jest.mock('./modes/editVertexMode/touchHandlers.js', () => ({ applyTouchVertexColors: jest.fn() }))
jest.mock('../../utils/resolveColors.js', () => ({
  resolveColors: jest.fn(() => ({ snapVertex: 'resolved-vertex', snapEdge: 'resolved-edge' }))
}))
jest.mock('./defaults.js', () => ({
  TOLERANCES: { snapRadius: 12 },
  MAP_SIZE_SCALES: { medium: 1.5 }
}))

const EVENTS = { MAP_SET_STYLE: 'map:setstyle', MAP_STYLE_CHANGE: 'map:stylechange', MAP_SET_SIZE: 'map:setsize', MAP_SET_PIXEL_RATIO: 'map:setpixelratio', MAP_DATA_CHANGE: 'map:datachange' }

const handlerFor = (mockFn, eventName) =>
  mockFn.mock.calls.find(([name]) => name === eventName)?.[1]

const createMap = ({ hasDrawSource = true } = {}) => ({
  addControl: jest.fn(),
  once: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  fire: jest.fn(),
  getSource: jest.fn(() => (hasDrawSource ? {} : undefined)),
  addSource: jest.fn(),
  addLayer: jest.fn(),
  triggerRepaint: jest.fn()
})

const setup = ({ existingDraw, existingUndoStack, pluginConfig, hasDrawSource } = {}) => {
  const map = createMap({ hasDrawSource })
  const mapProvider = {
    map,
    _mapboxDrawInstance: existingDraw,
    undoStack: existingUndoStack
  }
  const eventBus = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
  const removeWorkaround = jest.fn()
  setupTouchClickWorkaround.mockReturnValue({ remove: removeWorkaround })
  const pointStore = { get: jest.fn(), getAll: jest.fn(), write: jest.fn() }

  const result = createMapboxDraw({
    mapStyle: 'light',
    mapProvider,
    events: EVENTS,
    eventBus,
    snapLayers: ['layer-a'],
    pointStore,
    ...(pluginConfig !== undefined ? { pluginConfig } : {})
  })

  return { map, mapProvider, eventBus, removeWorkaround, result, pointStore }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('createMapboxDraw – instance creation', () => {
  test('configures the MapLibre control CSS class constants', () => {
    setup()
    expect(MapboxDraw.constants.classes).toMatchObject({
      CONTROL_BASE: 'maplibregl-ctrl',
      CONTROL_PREFIX: 'maplibregl-ctrl-',
      CONTROL_GROUP: 'maplibregl-ctrl-group'
    })
  })

  test('creates a new draw instance with the custom modes and adds it to the map', () => {
    const { map, mapProvider, result } = setup()

    expect(MapboxDraw).toHaveBeenCalledTimes(1)
    const options = MapboxDraw.mock.calls[0][0]
    expect(options).toMatchObject({
      styles: ['style'],
      displayControlsDefault: false,
      userProperties: true,
      defaultMode: 'disabled'
    })
    expect(options.modes).toMatchObject({
      existing_mode: { id: 'existing' },
      disabled: { id: 'disabled' },
      edit_vertex: { id: 'edit_vertex' },
      draw_polygon: { id: 'draw_polygon' },
      draw_line: { id: 'draw_line' }
    })
    expect(createDrawStyles).toHaveBeenCalledWith('light', {})

    const draw = MapboxDraw.mock.instances[0]
    expect(map.addControl).toHaveBeenCalledWith(draw)
    expect(mapProvider._mapboxDrawInstance).toBe(draw)
    expect(mapProvider.draw).toBe(draw)
    expect(result.draw).toBe(draw)
  })

  test('reuses an existing draw instance and merges modes instead of creating a new one', () => {
    const existingDraw = { modes: { old: {} }, changeMode: jest.fn() }
    const { map, mapProvider } = setup({ existingDraw })

    expect(MapboxDraw).not.toHaveBeenCalled()
    expect(map.addControl).not.toHaveBeenCalled()
    expect(existingDraw.modes).toMatchObject({
      old: {},
      disabled: { id: 'disabled' },
      edit_vertex: { id: 'edit_vertex' }
    })
    expect(mapProvider.draw).toBe(existingDraw)
  })
})

describe('createMapboxDraw – setup side effects', () => {
  test('sets up the touch-click workaround and records provider state', () => {
    const { map, mapProvider } = setup()

    expect(setupTouchClickWorkaround).toHaveBeenCalledWith(map, mapProvider.draw)
    expect(map._drawCurrentMapStyle).toBe('light')
    expect(mapProvider.snapEnabled).toBe(false)
  })

  test('stashes pluginConfig on the map for mode code that only has `this.map`', () => {
    const pluginConfig = { shapeStroke: '#custom' }
    const { map } = setup({ pluginConfig })

    expect(map._drawPluginConfig).toBe(pluginConfig)
  })

  test('defaults pluginConfig to {} when not provided', () => {
    const { map } = setup()

    expect(map._drawPluginConfig).toEqual({})
  })

  test('creates an undo stack when none exists and wires it to the map', () => {
    const { map, mapProvider } = setup()

    expect(createUndoStack).toHaveBeenCalledTimes(1)
    expect(mapProvider.undoStack).toEqual({ id: 'undo-stack' })
    expect(map._undoStack).toBe(mapProvider.undoStack)

    // The callback passed to createUndoStack fires a draw.undochange event
    const undoCallback = createUndoStack.mock.calls[0][0]
    undoCallback(3)
    expect(map.fire).toHaveBeenCalledWith('draw.undochange', { length: 3 })
  })

  test('reuses an existing undo stack', () => {
    const existingUndoStack = { id: 'existing-stack' }
    const { map } = setup({ existingUndoStack })

    expect(createUndoStack).not.toHaveBeenCalled()
    expect(map._undoStack).toBe(existingUndoStack)
  })

  test('initializes snapping with the default radius, rules, and resolved colours', () => {
    const { map, mapProvider } = setup()

    expect(initMapLibreSnap).toHaveBeenCalledWith(map, mapProvider.draw, {
      layers: ['layer-a'],
      radius: TOLERANCES.snapRadius,
      rules: ['vertex', 'edge'],
      colors: { vertex: 'resolved-vertex', edge: 'resolved-edge' }
    })
  })

  test('a pluginConfig.snapRadius overrides the default snap radius', () => {
    const { map, mapProvider } = setup({ pluginConfig: { snapRadius: 20 } })

    expect(initMapLibreSnap).toHaveBeenCalledWith(map, mapProvider.draw, expect.objectContaining({
      radius: 20
    }))
  })

  test('resolves snap colours from mapStyle + pluginConfig', () => {
    const pluginConfig = { snapVertex: '#custom' }
    setup({ pluginConfig })

    expect(resolveColors).toHaveBeenCalledWith('light', pluginConfig)
  })
})

describe('createMapboxDraw – event handlers', () => {
  // MAP_SET_STYLE fires the instant a style change is *requested* — before map.setStyle()
  // has necessarily even been called. Registering the idle/re-add work directly off it risks
  // catching the map still idle from the *previous* style, no-opping, and consuming itself
  // before the real wipe even happens. Only MAP_STYLE_CHANGE (which MapLibre only ever emits
  // off the native 'style.load' event, i.e. strictly after setStyle() was actually called)
  // should trigger the settle/idle work — this is the split under test throughout this block.
  test('MAP_SET_STYLE alone only stashes the style — no idle listener registered yet', () => {
    const { map, eventBus } = setup()

    handlerFor(eventBus.on, EVENTS.MAP_SET_STYLE)('dark')

    expect(map._drawCurrentMapStyle).toBe('dark')
    expect(map.once).not.toHaveBeenCalled()
  })

  test('MAP_STYLE_CHANGE updates the current style and restyles on idle', () => {
    const { map, eventBus, mapProvider, pointStore } = setup()

    map._drawEditContainer = { querySelector: jest.fn(() => 'svg-el') }
    handlerFor(eventBus.on, EVENTS.MAP_SET_STYLE)('dark')
    handlerFor(eventBus.on, EVENTS.MAP_STYLE_CHANGE)()

    const idleCallback = handlerFor(map.once, 'idle')
    idleCallback()
    expect(updateDrawStyles).toHaveBeenCalledWith(map, 'dark', {})
    expect(map._drawEditContainer.querySelector).toHaveBeenCalledWith('[data-im-draw-touch-target]')
    expect(applyTouchVertexColors).toHaveBeenCalledWith('svg-el', 'dark', {})
    expect(refreshAllPointSymbols).toHaveBeenCalledWith({ store: pointStore, mapProvider, map })
  })

  // MAP_STYLE_CHANGE genuinely fires twice per style change (mapEvents.js's permanent
  // 'style.load' listener alongside appEvents.js's one-shot listener, both bound to the same
  // native event) — without a dedupe guard the expensive settle work (idle-wait, re-rasterise
  // every point, one full source rewrite) runs twice back to back, and the second cycle's
  // completion can land after useHighlightSync's settle window has already closed.
  test('MAP_STYLE_CHANGE fired twice in a row (both listeners reacting to the same style.load) only settles once', async () => {
    const { map, eventBus } = setup()

    handlerFor(eventBus.on, EVENTS.MAP_SET_STYLE)('dark')
    handlerFor(eventBus.on, EVENTS.MAP_STYLE_CHANGE)()
    handlerFor(eventBus.on, EVENTS.MAP_STYLE_CHANGE)()

    expect(map.once).toHaveBeenCalledTimes(1)

    handlerFor(map.once, 'idle')()
    await Promise.resolve()
    expect(refreshAllPointSymbols).toHaveBeenCalledTimes(1)
    expect(eventBus.emit).toHaveBeenCalledTimes(1)

    // Once the in-flight settle has fully completed (onDone fired), a genuinely new style
    // change is free to trigger another one — the guard isn't stuck permanently latched.
    handlerFor(eventBus.on, EVENTS.MAP_STYLE_CHANGE)()
    expect(map.once).toHaveBeenCalledTimes(2)
  })

  // MapLibre's own setStyle() discards the entire previous Style — including every
  // programmatically-added source/layer, draw's included — and mapbox-gl-draw has no
  // listener of its own to restore them. Without this, every drawn feature (not just a
  // selected point) goes invisible and unqueryable after a style reload.
  //
  // draw.set() is asserted only after refreshAllPointSymbols resolves, not right after the
  // idle callback fires: mapbox-gl-draw's own store.render() is requestAnimationFrame-
  // debounced and bails out silently if the source doesn't exist yet, so pushing draw.getAll()
  // back in *before* every point's image ids have been re-resolved for the new style would
  // schedule a deferred render using the previous (already-wiped) style's ids — racing a
  // still-in-flight worker tile parse of that stale data against the correct one moments
  // later. Exactly one write, with final data, after refreshAllPointSymbols settles.
  test('re-creates the sources and layers, then re-pushes every feature (only once symbols have re-resolved), when the draw source is missing after settling', async () => {
    const { map, eventBus, result } = setup({ hasDrawSource: false })

    handlerFor(eventBus.on, EVENTS.MAP_SET_STYLE)('dark')
    handlerFor(eventBus.on, EVENTS.MAP_STYLE_CHANGE)()
    handlerFor(map.once, 'idle')()

    expect(map.addSource).toHaveBeenCalledWith('mapbox-gl-draw-cold', { data: { type: 'FeatureCollection', features: [] }, type: 'geojson' })
    expect(map.addSource).toHaveBeenCalledWith('mapbox-gl-draw-hot', { data: { type: 'FeatureCollection', features: [] }, type: 'geojson' })
    // draw.options.styles (mirrors mapbox-gl-draw's own api.options = options) — the fully
    // processed cold+hot layer pairs from construction time, not re-derived from scratch.
    expect(map.addLayer).toHaveBeenCalledWith({ id: 'fill-inactive.cold' })
    expect(map.addLayer).toHaveBeenCalledWith({ id: 'fill-inactive.hot' })
    // Not yet — refreshAllPointSymbols (mocked as a pending promise below) hasn't resolved.
    expect(result.draw.set).not.toHaveBeenCalled()

    await Promise.resolve() // flush the refreshAllPointSymbols().then(...) microtask
    // Sources start empty — every feature the draw control still holds (map-independent, in
    // its own JS store) is pushed back through the public API to force a full render, now
    // with every point's image ids already resolved for the new style.
    expect(result.draw.set).toHaveBeenCalledWith(result.draw.getAll())
  })

  test('does nothing when the draw source survived the style reload', async () => {
    const { map, eventBus, result } = setup({ hasDrawSource: true })

    handlerFor(eventBus.on, EVENTS.MAP_SET_STYLE)('dark')
    handlerFor(eventBus.on, EVENTS.MAP_STYLE_CHANGE)()
    handlerFor(map.once, 'idle')()
    await Promise.resolve()

    expect(map.addSource).not.toHaveBeenCalled()
    expect(map.addLayer).not.toHaveBeenCalled()
    expect(result.draw.set).not.toHaveBeenCalled()
  })

  // A selected point's highlight ring (plugins/interact's useHighlightSync) only re-applies
  // on MAP_DATA_CHANGE — this nudges it explicitly once refreshAllPointSymbols has actually
  // finished, rather than relying on 'styledata'/'sourcedata' firing it as a side effect.
  test('emits MAP_DATA_CHANGE once point symbols have actually finished re-resolving after a style change', async () => {
    const { map, eventBus } = setup()
    handlerFor(eventBus.on, EVENTS.MAP_SET_STYLE)('dark')
    handlerFor(eventBus.on, EVENTS.MAP_STYLE_CHANGE)()
    handlerFor(map.once, 'idle')()
    await Promise.resolve() // flush the refreshAllPointSymbols().then(...) microtask
    expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.MAP_DATA_CHANGE)
  })

  // The highlight ring is a standalone layer added from outside mapbox-gl-draw's own render
  // cycle (unlike a vertex's active ring, which is just a filter on a layer mapbox-gl-draw
  // itself always keeps painted) — nothing guarantees MapLibre schedules a real paint pass to
  // pick it up right after settling. Confirmed by repro: the ring, and separately this app's
  // own queryRenderedFeatures-based hover cursor (same painted-tile-buffer dependency), stayed
  // stale until an unrelated map drag forced a render.
  test('triggers a repaint once point symbols have finished re-resolving after a style change', async () => {
    const { map, eventBus } = setup()
    handlerFor(eventBus.on, EVENTS.MAP_SET_STYLE)('dark')
    handlerFor(eventBus.on, EVENTS.MAP_STYLE_CHANGE)()
    handlerFor(map.once, 'idle')()
    expect(map.triggerRepaint).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(map.triggerRepaint).toHaveBeenCalled()
  })

  test('MAP_STYLE_CHANGE idle handler tolerates a missing edit container', () => {
    const { map, eventBus } = setup()

    handlerFor(eventBus.on, EVENTS.MAP_SET_STYLE)('dark')
    handlerFor(eventBus.on, EVENTS.MAP_STYLE_CHANGE)()
    handlerFor(map.once, 'idle')()

    expect(applyTouchVertexColors).toHaveBeenCalledWith(undefined, 'dark', {})
  })

  test('MAP_STYLE_CHANGE passes pluginConfig through to restyling and touch colours', () => {
    const pluginConfig = { editStroke: '#custom' }
    const { map, eventBus } = setup({ pluginConfig })

    handlerFor(eventBus.on, EVENTS.MAP_SET_STYLE)('dark')
    handlerFor(eventBus.on, EVENTS.MAP_STYLE_CHANGE)()
    handlerFor(map.once, 'idle')()

    expect(updateDrawStyles).toHaveBeenCalledWith(map, 'dark', pluginConfig)
    expect(applyTouchVertexColors).toHaveBeenCalledWith(undefined, 'dark', pluginConfig)
  })

  test('draw.interfacetypechange is not handled here — the adapter normalises it onto the bus', () => {
    const { map } = setup()
    expect(map.on).not.toHaveBeenCalledWith('draw.interfacetypechange', expect.any(Function))
  })

  test('MAP_SET_SIZE fires a scale change using the size lookup', () => {
    const { map, eventBus } = setup()

    handlerFor(eventBus.on, EVENTS.MAP_SET_SIZE)('medium')

    expect(map.fire).toHaveBeenCalledWith('draw.scalechange', { scale: MAP_SIZE_SCALES.medium })
  })

  // map.getPixelRatio() never updates itself from a plain map-size change — nothing in this
  // app calls map.setPixelRatio() off MAP_SET_SIZE alone, so a point-symbol refresh here
  // would run before the map actually knows about the new size. MAP_SET_PIXEL_RATIO (fired
  // separately, after MAP_SET_SIZE, carrying the freshly computed value) owns that instead.
  test('MAP_SET_SIZE does not refresh point symbols — MAP_SET_PIXEL_RATIO owns that', () => {
    const { eventBus } = setup()
    handlerFor(eventBus.on, EVENTS.MAP_SET_SIZE)('medium')
    expect(refreshAllPointSymbols).not.toHaveBeenCalled()
  })

  test('MAP_SET_PIXEL_RATIO refreshes point symbols with the freshly computed pixel ratio', () => {
    const { map, eventBus, mapProvider, pointStore } = setup()
    handlerFor(eventBus.on, EVENTS.MAP_SET_PIXEL_RATIO)(3)
    expect(refreshAllPointSymbols).toHaveBeenCalledWith({ store: pointStore, mapProvider, map, pixelRatioOverride: 3 })
  })

  test('MAP_SET_PIXEL_RATIO emits MAP_DATA_CHANGE once point symbols have actually finished re-resolving', async () => {
    const { eventBus } = setup()
    handlerFor(eventBus.on, EVENTS.MAP_SET_PIXEL_RATIO)(3)
    await Promise.resolve()
    expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.MAP_DATA_CHANGE)
  })

  test('MAP_SET_PIXEL_RATIO triggers a repaint once point symbols have finished re-resolving', async () => {
    const { map, eventBus } = setup()
    handlerFor(eventBus.on, EVENTS.MAP_SET_PIXEL_RATIO)(3)
    expect(map.triggerRepaint).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(map.triggerRepaint).toHaveBeenCalled()
  })
})

describe('createMapboxDraw – cleanup', () => {
  test('remove() detaches listeners, disables draw and clears the adapter reference', () => {
    const { mapProvider, eventBus, removeWorkaround, result } = setup()
    const draw = mapProvider.draw

    result.remove()

    expect(removeWorkaround).toHaveBeenCalledTimes(1)
    expect(eventBus.off).toHaveBeenCalledWith(EVENTS.MAP_SET_STYLE, expect.any(Function))
    expect(eventBus.off).toHaveBeenCalledWith(EVENTS.MAP_STYLE_CHANGE, expect.any(Function))
    expect(eventBus.off).toHaveBeenCalledWith(EVENTS.MAP_SET_SIZE, expect.any(Function))
    expect(eventBus.off).toHaveBeenCalledWith(EVENTS.MAP_SET_PIXEL_RATIO, expect.any(Function))
    expect(draw.changeMode).toHaveBeenCalledWith('disabled')
    expect(mapProvider.draw).toBeNull()
    expect(mapProvider._mapboxDrawInstance).toBe(draw)
  })
})
