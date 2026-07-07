import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { createDrawStyles, updateDrawStyles } from './styles.js'
import { initMapLibreSnap } from './mapboxSnap.js'
import { createUndoStack } from '../../utils/undoStack.js'
import { setupTouchClickWorkaround } from './utils/touchClickWorkaround.js'
import { applyTouchVertexColors } from './modes/editVertexMode/touchHandlers.js'
import { TOLERANCES, MAP_SIZE_SCALES } from './defaults.js'
import { createMapboxDraw } from './mapboxDraw.js'

jest.mock('@mapbox/mapbox-gl-draw', () => {
  const MockDraw = jest.fn(function () {
    this.modes = {}
    this.changeMode = jest.fn()
  })
  MockDraw.constants = { classes: {} }
  MockDraw.modes = { existing_mode: { id: 'existing' } }
  return { __esModule: true, default: MockDraw }
})

jest.mock('./modes/disabledMode.js', () => ({ DisabledMode: { id: 'disabled' } }))
jest.mock('./modes/editVertexMode.js', () => ({ EditVertexMode: { id: 'edit_vertex' } }))
jest.mock('./modes/drawPolygonMode.js', () => ({ DrawPolygonMode: { id: 'draw_polygon' } }))
jest.mock('./modes/drawLineMode.js', () => ({ DrawLineMode: { id: 'draw_line' } }))
jest.mock('./styles.js', () => ({
  createDrawStyles: jest.fn(() => ['style']),
  updateDrawStyles: jest.fn()
}))
jest.mock('./mapboxSnap.js', () => ({ initMapLibreSnap: jest.fn() }))
jest.mock('../../utils/undoStack.js', () => ({ createUndoStack: jest.fn(() => ({ id: 'undo-stack' })) }))
jest.mock('./utils/touchClickWorkaround.js', () => ({ setupTouchClickWorkaround: jest.fn() }))
jest.mock('./modes/editVertexMode/touchHandlers.js', () => ({ applyTouchVertexColors: jest.fn() }))
jest.mock('./defaults.js', () => ({
  TOLERANCES: { snapRadius: 12 },
  MAP_SIZE_SCALES: { medium: 1.5 }
}))

const EVENTS = { MAP_SET_STYLE: 'map:setstyle', MAP_SET_SIZE: 'map:setsize' }

const handlerFor = (mockFn, eventName) =>
  mockFn.mock.calls.find(([name]) => name === eventName)?.[1]

const createMap = () => ({
  addControl: jest.fn(),
  once: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  fire: jest.fn()
})

const setup = ({ existingDraw, existingUndoStack } = {}) => {
  const map = createMap()
  const mapProvider = {
    map,
    _mapboxDrawInstance: existingDraw,
    undoStack: existingUndoStack
  }
  const eventBus = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
  const removeWorkaround = jest.fn()
  setupTouchClickWorkaround.mockReturnValue({ remove: removeWorkaround })

  const result = createMapboxDraw({
    mapStyle: 'light',
    mapProvider,
    events: EVENTS,
    eventBus,
    snapLayers: ['layer-a']
  })

  return { map, mapProvider, eventBus, removeWorkaround, result }
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
    expect(createDrawStyles).toHaveBeenCalledWith('light')

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

  test('initializes snapping with the configured radius and rules', () => {
    const { map, mapProvider } = setup()

    expect(initMapLibreSnap).toHaveBeenCalledWith(map, mapProvider.draw, {
      layers: ['layer-a'],
      radius: TOLERANCES.snapRadius,
      rules: ['vertex', 'edge']
    })
  })
})

describe('createMapboxDraw – event handlers', () => {
  test('MAP_SET_STYLE updates the current style and restyles on idle', () => {
    const { map, eventBus } = setup()

    const styleHandler = handlerFor(eventBus.on, EVENTS.MAP_SET_STYLE)
    map._drawEditContainer = { querySelector: jest.fn(() => 'svg-el') }
    styleHandler('dark')

    expect(map._drawCurrentMapStyle).toBe('dark')

    const idleCallback = handlerFor(map.once, 'idle')
    idleCallback()
    expect(updateDrawStyles).toHaveBeenCalledWith(map, 'dark')
    expect(map._drawEditContainer.querySelector).toHaveBeenCalledWith('[data-im-draw-touch-target]')
    expect(applyTouchVertexColors).toHaveBeenCalledWith('svg-el', 'dark')
  })

  test('MAP_SET_STYLE idle handler tolerates a missing edit container', () => {
    const { map, eventBus } = setup()

    handlerFor(eventBus.on, EVENTS.MAP_SET_STYLE)('dark')
    handlerFor(map.once, 'idle')()

    expect(applyTouchVertexColors).toHaveBeenCalledWith(undefined, 'dark')
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
})

describe('createMapboxDraw – cleanup', () => {
  test('remove() detaches listeners, disables draw and clears the adapter reference', () => {
    const { mapProvider, eventBus, removeWorkaround, result } = setup()
    const draw = mapProvider.draw

    result.remove()

    expect(removeWorkaround).toHaveBeenCalledTimes(1)
    expect(eventBus.off).toHaveBeenCalledWith(EVENTS.MAP_SET_STYLE, expect.any(Function))
    expect(eventBus.off).toHaveBeenCalledWith(EVENTS.MAP_SET_SIZE, expect.any(Function))
    expect(draw.changeMode).toHaveBeenCalledWith('disabled')
    expect(mapProvider.draw).toBeNull()
    expect(mapProvider._mapboxDrawInstance).toBe(draw)
  })
})
