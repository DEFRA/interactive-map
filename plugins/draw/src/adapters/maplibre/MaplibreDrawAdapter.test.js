import { createMapboxDraw } from './mapboxDraw.js'
import { getSnapInstance, clearSnapState, clearSnapIndicator } from './utils/snapHelpers.js'
import { createEventBus } from '../../utils/eventBus.js'
import { MAPBOX_DRAW_EVENTS, CUSTOM_DRAW_EVENTS, STYLE_DATA_EVENT } from './drawEvents.js'
import { MaplibreDrawAdapter, displayedShape } from './MaplibreDrawAdapter.js'

jest.mock('./mapboxDraw.js', () => ({ createMapboxDraw: jest.fn() }))
jest.mock('./utils/snapHelpers.js', () => ({
  getSnapInstance: jest.fn(),
  clearSnapState: jest.fn(),
  clearSnapIndicator: jest.fn()
}))
jest.mock('../../utils/eventBus.js', () => ({ createEventBus: jest.fn() }))

const SNAP_LAYER = 'snap-helper-circle'

const onHandler = (map, event) => map.on.mock.calls.find(([name]) => name === event)?.[1]

const setup = () => {
  const map = {
    on: jest.fn(),
    off: jest.fn(),
    fire: jest.fn(),
    getLayer: jest.fn(() => null),
    setLayoutProperty: jest.fn(),
    getStyle: jest.fn(() => ({ layers: [] })),
    moveLayer: jest.fn()
  }
  const undoStack = { clear: jest.fn() }
  const mapProvider = { map, undoStack, snapEnabled: false }
  const draw = {
    changeMode: jest.fn(),
    getMode: jest.fn(() => 'disabled'),
    get: jest.fn((id) => ({ id })),
    add: jest.fn(),
    delete: jest.fn(),
    deleteAll: jest.fn(),
    trash: jest.fn(),
    setFeatureProperty: jest.fn()
  }
  const removeDraw = jest.fn()
  createMapboxDraw.mockReturnValue({ draw, remove: removeDraw })

  const bus = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
  createEventBus.mockReturnValue(bus)

  const options = {
    mapStyle: 'light',
    events: { MAP_SET_STYLE: 'mss' },
    eventBus: { on: jest.fn() },
    snapLayers: ['layer-a']
  }
  const adapter = new MaplibreDrawAdapter(mapProvider, options)

  return { adapter, map, mapProvider, draw, removeDraw, bus, undoStack, options }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('construction', () => {
  test('creates the MapboxDraw control with the provided options', () => {
    const { options } = setup()
    expect(createMapboxDraw).toHaveBeenCalledWith({
      mapStyle: 'light',
      mapProvider: expect.any(Object),
      events: options.events,
      eventBus: options.eventBus,
      snapLayers: ['layer-a']
    })
  })

  test('subscribes to every MapLibre draw event', () => {
    const { map } = setup()
    const subscribed = map.on.mock.calls.map(([name]) => name)
    expect(subscribed).toEqual(expect.arrayContaining([
      MAPBOX_DRAW_EVENTS.CREATE, MAPBOX_DRAW_EVENTS.UPDATE, MAPBOX_DRAW_EVENTS.MODE_CHANGE,
      CUSTOM_DRAW_EVENTS.EDIT_FINISH, CUSTOM_DRAW_EVENTS.CANCEL, CUSTOM_DRAW_EVENTS.VERTEX_SELECTION,
      CUSTOM_DRAW_EVENTS.VERTEX_CHANGE, CUSTOM_DRAW_EVENTS.UNDO_CHANGE, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE,
      STYLE_DATA_EVENT
    ]))
  })
})

describe('map event normalisation', () => {
  test('create/editfinish/update forward the first feature', () => {
    const { map, bus } = setup()
    const feature = { id: 'f1' }

    onHandler(map, MAPBOX_DRAW_EVENTS.CREATE)({ features: [feature] })
    onHandler(map, CUSTOM_DRAW_EVENTS.EDIT_FINISH)({ features: [feature] })
    onHandler(map, MAPBOX_DRAW_EVENTS.UPDATE)({ features: [feature] })

    expect(bus.emit).toHaveBeenCalledWith('create', feature)
    expect(bus.emit).toHaveBeenCalledWith('editfinish', feature)
    expect(bus.emit).toHaveBeenCalledWith('update', feature)
  })

  test('cancel forwards with no payload', () => {
    const { map, bus } = setup()
    onHandler(map, CUSTOM_DRAW_EVENTS.CANCEL)()
    expect(bus.emit).toHaveBeenCalledWith('cancel')
  })

  test('vertexselection/vertexchange normalise the numVertecies typo', () => {
    const { map, bus } = setup()

    onHandler(map, CUSTOM_DRAW_EVENTS.VERTEX_SELECTION)({ numVertecies: 3, index: 1 })
    onHandler(map, CUSTOM_DRAW_EVENTS.VERTEX_CHANGE)({ numVertecies: 2 })

    expect(bus.emit).toHaveBeenCalledWith('vertexselection', expect.objectContaining({ numVertices: 3, index: 1 }))
    expect(bus.emit).toHaveBeenCalledWith('vertexchange', expect.objectContaining({ numVertices: 2 }))
  })

  test('undochange forwards the stack length', () => {
    const { map, bus } = setup()
    onHandler(map, CUSTOM_DRAW_EVENTS.UNDO_CHANGE)({ length: 4 })
    expect(bus.emit).toHaveBeenCalledWith('undochange', 4)
  })

  test('geometrychange forwards the raw event', () => {
    const { map, bus } = setup()
    const e = { type: 'Polygon' }
    onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)(e)
    expect(bus.emit).toHaveBeenCalledWith('geometrychange', e)
  })

  test('placementblocked forwards the raw event', () => {
    const { map, bus } = setup()
    const e = { kind: 'place', reason: 'outside region' }
    onHandler(map, CUSTOM_DRAW_EVENTS.PLACEMENT_BLOCKED)(e)
    expect(bus.emit).toHaveBeenCalledWith('placementblocked', e)
  })
})

describe('displayedShape helper', () => {
  test('builds a polygon feature from draw_polygon mode', () => {
    const result = displayedShape('draw_polygon', [[[0, 0], [10, 0], [10, 10], [0, 0]]])
    expect(result?.feature?.type).toBe('Feature')
    expect(result?.feature?.geometry?.type).toBe('Polygon')
    expect(result?.placedCount).toBe(3)
  })

  test('builds a line feature from draw_line mode', () => {
    const result = displayedShape('draw_line', [[0, 0], [10, 0], [10, 10]])
    expect(result?.feature?.type).toBe('Feature')
    expect(result?.feature?.geometry?.type).toBe('LineString')
    expect(result?.placedCount).toBe(2)
  })

  test('detects polygon vs line in edit_vertex mode from coordinate nesting', () => {
    const polygon = displayedShape('edit_vertex', [[[0, 0], [10, 0], [10, 10], [0, 0]]])
    expect(polygon?.feature?.geometry?.type).toBe('Polygon')
    const line = displayedShape('edit_vertex', [[0, 0], [10, 0], [10, 10]])
    expect(line?.feature?.geometry?.type).toBe('LineString')
  })

  test('returns null for an unknown mode', () => {
    expect(displayedShape('unknown_mode', [[0, 0], [10, 0]])).toBeNull()
  })
})

describe('live invalid stroke (draw mode)', () => {
  // Displayed rings (placed vertices + cursor) as the listener really receives them:
  // MapLibre's fire() wraps the gl-draw feature in an Event whose `type` is the
  // event name — the geometry type is clobbered, only `coordinates` survives.
  const bowtie = { type: 'draw.geometrychange', coordinates: [[[0, 0], [10, 10], [10, 0], [0, 10]]] }
  const square = { type: 'draw.geometrychange', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10]]] }

  const drawPolygonSetup = () => {
    const fixture = setup()
    fixture.draw.getMode.mockReturnValue('draw_polygon')
    fixture.map.getLayer.mockReturnValue({})
    return fixture
  }

  test('a self-intersecting displayed ring turns the stroke dashed; simple again restores it', () => {
    const { map } = drawPolygonSetup()
    const fire = onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)

    fire(bowtie)
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active-invalid.hot', 'visibility', 'visible')

    map.setLayoutProperty.mockClear()
    fire(square)
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active.hot', 'visibility', 'visible')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active-invalid.hot', 'visibility', 'none')
  })

  test('only restyles when the invalid state flips, not on every move', () => {
    const { map } = drawPolygonSetup()
    const fire = onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)
    fire(bowtie)
    const callsAfterFlip = map.setLayoutProperty.mock.calls.length
    fire(bowtie)
    fire(bowtie)
    expect(map.setLayoutProperty.mock.calls.length).toBe(callsAfterFlip)
  })

  test('commit-level (kind-ful) events do not drive the stroke; events.js owns those', () => {
    const { map } = drawPolygonSetup()
    onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)({ feature: bowtie, kind: 'add', vertexIndex: 3 })
    expect(map.setLayoutProperty).not.toHaveBeenCalled()
  })

  test('lines never go dashed from the live check', () => {
    const { map, draw } = drawPolygonSetup()
    draw.getMode.mockReturnValue('draw_line')
    onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)({ type: 'draw.geometrychange', coordinates: [[0, 0], [10, 10], [10, 0], [0, 10]] })
    expect(map.setLayoutProperty).not.toHaveBeenCalled()
  })

  test('the rubber band sitting on the just-placed vertex never reads as a crossing', () => {
    const { map } = drawPolygonSetup()
    // 3 placed + rubber band duplicating the last placed vertex.
    const justPlaced = { type: 'draw.geometrychange', coordinates: [[[0, 0], [10, 0], [10, 10], [10, 10]]] }
    onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)(justPlaced)
    expect(map.setLayoutProperty).not.toHaveBeenCalledWith('stroke-active-invalid.hot', 'visibility', 'visible')
  })

  test('a placement-vetoing path disables Add point; a legal one re-enables it', () => {
    const { map, bus } = drawPolygonSetup()
    const fire = onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)
    // Open drawn path crosses itself → placing at the crosshair would be vetoed.
    fire({ type: 'draw.geometrychange', coordinates: [[[0, 0], [2, 2], [2, 0], [0, 2]]] })
    expect(bus.emit).toHaveBeenCalledWith('canplacechange', expect.objectContaining({ canPlace: false, reason: expect.any(String) }))
    fire({ type: 'draw.geometrychange', coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2]]] })
    expect(bus.emit).toHaveBeenCalledWith('canplacechange', expect.objectContaining({ canPlace: true }))
  })

  test('a red stroke via the closing edge alone keeps Add point enabled', () => {
    const { map, bus } = drawPolygonSetup()
    // Only the implicit closing edge crosses: stroke dashed, but the placement is legal.
    onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)({ type: 'draw.geometrychange', coordinates: [[[0, 0], [2, 0], [0, 2], [2, 2]]] })
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active-invalid.hot', 'visibility', 'visible')
    expect(bus.emit).not.toHaveBeenCalledWith('canplacechange', expect.objectContaining({ canPlace: false }))
  })

  test('entering a draw mode resets the stroke to solid', () => {
    const { adapter, map } = drawPolygonSetup()
    onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)(bowtie) // dashed
    map.setLayoutProperty.mockClear()
    adapter.changeMode('draw_polygon')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active.hot', 'visibility', 'visible')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active-invalid.hot', 'visibility', 'none')
    // ...and the flip guard is reset with it, so the next crossing restyles again.
    map.setLayoutProperty.mockClear()
    onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)(bowtie)
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active-invalid.hot', 'visibility', 'visible')
  })
})

describe('live invalid stroke (edit mode)', () => {
  const editSetup = () => {
    const fixture = setup()
    fixture.draw.getMode.mockReturnValue('edit_vertex')
    fixture.map.getLayer.mockReturnValue({})
    return fixture
  }

  test('dragging a polygon vertex into a crossing turns the stroke dashed, and back', () => {
    const { map } = editSetup()
    const fire = onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)
    // Edit payloads have the type clobbered too — polygon detected from ring nesting.
    fire({ type: 'draw.geometrychange', coordinates: [[[0, 0], [10, 10], [10, 0], [0, 10]]] })
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active-invalid.hot', 'visibility', 'visible')
    map.setLayoutProperty.mockClear()
    fire({ type: 'draw.geometrychange', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10]]] })
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active.hot', 'visibility', 'visible')
  })

  test('validity flips while editing also gate the Done button', () => {
    const { map, bus } = editSetup()
    const fire = onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)
    fire({ type: 'draw.geometrychange', coordinates: [[[0, 0], [10, 10], [10, 0], [0, 10]]] })
    expect(bus.emit).toHaveBeenCalledWith('validitychange', expect.objectContaining({ valid: false, reason: expect.any(String) }))
    fire({ type: 'draw.geometrychange', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10]]] })
    expect(bus.emit).toHaveBeenCalledWith('validitychange', expect.objectContaining({ valid: true }))
    // Add point is a draw-mode concern — never driven from edit mode.
    expect(bus.emit).not.toHaveBeenCalledWith('canplacechange', expect.anything())
  })

  test('lines never go dashed from the default rules while editing', () => {
    const { map } = editSetup()
    onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)({ type: 'draw.geometrychange', coordinates: [[0, 0], [10, 10], [10, 0], [0, 10]] })
    expect(map.setLayoutProperty).not.toHaveBeenCalled()
  })

  test('the user callback runs throttled during an edit drag', () => {
    jest.useFakeTimers()
    const { map } = editSetup()
    map._drawGeometryValidator = jest.fn(() => ({ valid: false, reason: 'outside region' }))
    const fire = onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)
    fire({ type: 'draw.geometrychange', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10]]] })
    fire({ type: 'draw.geometrychange', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 11]]] })
    expect(map._drawGeometryValidator).not.toHaveBeenCalled() // deferred to the frame
    jest.runAllTimers()
    expect(map._drawGeometryValidator).toHaveBeenCalledTimes(1) // trailing edge only
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active-invalid.hot', 'visibility', 'visible')
    jest.useRealTimers()
  })
})

describe('_geometryValidator accessor', () => {
  test('stores the validator on the map for modes to read, and reads it back', () => {
    const { adapter, map } = setup()
    const validator = () => true
    adapter._geometryValidator = validator
    expect(map._drawGeometryValidator).toBe(validator)
    expect(adapter._geometryValidator).toBe(validator)
  })
})

describe('changeMode', () => {
  test('records the editing feature id when entering edit_vertex', () => {
    const { adapter, draw } = setup()
    adapter.changeMode('edit_vertex', { featureId: 'f9' })
    expect(draw.changeMode).toHaveBeenCalledWith('edit_vertex', { featureId: 'f9' })
  })

  test('defaults the editing feature id to null when omitted', () => {
    const { adapter, draw } = setup()
    adapter.changeMode('edit_vertex', {})
    draw.getMode.mockReturnValue('edit_vertex')
    adapter.done()
    // no editing feature id → no editfinish fired
    expect(draw.changeMode).toHaveBeenCalledWith('edit_vertex', {})
  })

  test('passes through non-edit modes with default options', () => {
    const { adapter, draw } = setup()
    adapter.changeMode('draw_polygon')
    expect(draw.changeMode).toHaveBeenCalledWith('draw_polygon', {})
  })
})

describe('setGeometryValid', () => {
  test('records validity on the map for the draw mode to read', () => {
    const { adapter, map } = setup()
    adapter.setGeometryValid(false)
    expect(map._drawGeometryValid).toBe(false)
    adapter.setGeometryValid(true)
    expect(map._drawGeometryValid).toBe(true)
  })
})

describe('setInvalid', () => {
  test('shows the dashed stroke and hides the solid stroke and fill when invalid', () => {
    const { adapter, map } = setup()
    map.getLayer.mockReturnValue({}) // every layer exists
    adapter.setInvalid(true)
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active.hot', 'visibility', 'none')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active.cold', 'visibility', 'none')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active-invalid.hot', 'visibility', 'visible')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active-invalid.cold', 'visibility', 'visible')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('fill-active.hot', 'visibility', 'none')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('fill-active.cold', 'visibility', 'none')
  })

  test('restores the solid stroke and fill when valid again', () => {
    const { adapter, map } = setup()
    map.getLayer.mockReturnValue({})
    adapter.setInvalid(true)
    map.setLayoutProperty.mockClear()
    adapter.setInvalid(false)
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active.hot', 'visibility', 'visible')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active-invalid.hot', 'visibility', 'none')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('fill-active.hot', 'visibility', 'visible')
  })

  test('writes are flip-guarded: repeating the same state does not touch the layers', () => {
    const { adapter, map } = setup()
    map.getLayer.mockReturnValue({})
    adapter.setInvalid(false) // already solid — no-op
    expect(map.setLayoutProperty).not.toHaveBeenCalled()
    adapter.setInvalid(true)
    map.setLayoutProperty.mockClear()
    adapter.setInvalid(true) // already dashed — no-op
    expect(map.setLayoutProperty).not.toHaveBeenCalled()
  })

  test('skips layers that are not present on the map', () => {
    const { adapter, map } = setup()
    map.getLayer.mockReturnValue(null)
    adapter.setInvalid(true)
    expect(map.setLayoutProperty).not.toHaveBeenCalled()
  })
})

describe('simple delegations', () => {
  test('getMode delegates to the draw control', () => {
    const { adapter, draw } = setup()
    draw.getMode.mockReturnValue('draw_line')
    expect(adapter.getMode()).toBe('draw_line')
  })

  test('setInterfaceType fires the interface-type-change event', () => {
    const { adapter, map } = setup()
    adapter.setInterfaceType('keyboard')
    expect(map.fire).toHaveBeenCalledWith(CUSTOM_DRAW_EVENTS.INTERFACE_TYPE_CHANGE, { interfaceType: 'keyboard' })
  })

  test('undo fires the undo event', () => {
    const { adapter, map } = setup()
    adapter.undo()
    expect(map.fire).toHaveBeenCalledWith(CUSTOM_DRAW_EVENTS.UNDO)
  })

  test('deleteVertex is a no-op', () => {
    const { adapter, draw, map } = setup()
    expect(() => adapter.deleteVertex()).not.toThrow()
    expect(draw.changeMode).not.toHaveBeenCalled()
    expect(map.fire).not.toHaveBeenCalled()
  })

  test('feature store methods delegate to the draw control', () => {
    const { adapter, draw } = setup()
    adapter.get('a')
    adapter.add({ id: 'b' })
    adapter.delete('c')
    adapter.deleteAll()
    adapter.setFeatureProperty('d', 'p', 1)

    expect(draw.get).toHaveBeenCalledWith('a')
    expect(draw.add).toHaveBeenCalledWith({ id: 'b' })
    expect(draw.delete).toHaveBeenCalledWith('c')
    expect(draw.deleteAll).toHaveBeenCalled()
    expect(draw.setFeatureProperty).toHaveBeenCalledWith('d', 'p', 1)
  })

  test('on/off delegate to the internal event bus', () => {
    const { adapter, bus } = setup()
    const handler = jest.fn()
    adapter.on('create', handler)
    adapter.off('create', handler)
    expect(bus.on).toHaveBeenCalledWith('create', handler)
    expect(bus.off).toHaveBeenCalledWith('create', handler)
  })

  test('isSnapEnabled reflects the provider flag', () => {
    const { adapter, mapProvider } = setup()
    expect(adapter.isSnapEnabled()).toBe(false)
    mapProvider.snapEnabled = true
    expect(adapter.isSnapEnabled()).toBe(true)
  })
})

describe('done', () => {
  test('clears the undo stack and fires editfinish when editing a vertex', () => {
    const { adapter, map, draw, undoStack } = setup()
    adapter.changeMode('edit_vertex', { featureId: 'f1' })
    draw.getMode.mockReturnValue('edit_vertex')

    adapter.done()

    expect(undoStack.clear).toHaveBeenCalled()
    expect(map.fire).toHaveBeenCalledWith(CUSTOM_DRAW_EVENTS.EDIT_FINISH, { features: [{ id: 'f1' }] })
    expect(draw.changeMode).not.toHaveBeenCalledWith('disabled')
  })

  test('disables the control when finishing a draw mode', () => {
    const { adapter, draw } = setup()
    draw.getMode.mockReturnValue('draw_polygon')
    adapter.done()
    expect(draw.changeMode).toHaveBeenCalledWith('disabled')

    draw.getMode.mockReturnValue('draw_line')
    adapter.done()
    expect(draw.changeMode).toHaveBeenCalledWith('disabled')
  })

  test('does nothing further for edit_vertex without an editing feature id', () => {
    const { adapter, draw, map } = setup()
    draw.getMode.mockReturnValue('edit_vertex')
    adapter.done()
    expect(map.fire).not.toHaveBeenCalled()
    expect(draw.changeMode).not.toHaveBeenCalled()
  })
})

describe('cancel', () => {
  test('clears the undo stack, trashes and disables the control', () => {
    const { adapter, draw, undoStack } = setup()
    adapter.cancel()
    expect(undoStack.clear).toHaveBeenCalled()
    expect(draw.trash).toHaveBeenCalled()
    expect(draw.changeMode).toHaveBeenCalledWith('disabled')
  })
})

describe('setSnapEnabled', () => {
  test('enables snapping via the snap instance', () => {
    const { adapter, mapProvider } = setup()
    const snap = { setSnapStatus: jest.fn() }
    getSnapInstance.mockReturnValue(snap)

    adapter.setSnapEnabled(true)

    expect(mapProvider.snapEnabled).toBe(true)
    expect(snap.setSnapStatus).toHaveBeenCalledWith(true)
    expect(clearSnapState).not.toHaveBeenCalled()
  })

  test('disabling clears snap state and hides the indicator when present', () => {
    const { adapter, map } = setup()
    const snap = { setSnapStatus: jest.fn() }
    getSnapInstance.mockReturnValue(snap)
    map.getLayer.mockReturnValue({ id: SNAP_LAYER })

    adapter.setSnapEnabled(false)

    expect(snap.setSnapStatus).toHaveBeenCalledWith(false)
    expect(clearSnapState).toHaveBeenCalledWith(snap)
    expect(map.setLayoutProperty).toHaveBeenCalledWith(SNAP_LAYER, 'visibility', 'none')
  })

  test('disabling without the indicator layer skips the layout update', () => {
    const { adapter, map } = setup()
    const snap = { setSnapStatus: jest.fn() }
    getSnapInstance.mockReturnValue(snap)
    map.getLayer.mockReturnValue(null)

    adapter.setSnapEnabled(false)

    expect(clearSnapState).toHaveBeenCalledWith(snap)
    expect(map.setLayoutProperty).not.toHaveBeenCalled()
  })

  test('tolerates a missing snap instance', () => {
    const { adapter, mapProvider } = setup()
    getSnapInstance.mockReturnValue(null)

    adapter.setSnapEnabled(false)

    expect(mapProvider.snapEnabled).toBe(false)
    expect(clearSnapState).not.toHaveBeenCalled()
  })

  test('tolerates a snap instance without setSnapStatus', () => {
    const { adapter } = setup()
    getSnapInstance.mockReturnValue({})
    expect(() => adapter.setSnapEnabled(true)).not.toThrow()
  })
})

describe('setSnapLayers', () => {
  test('forwards layers to the snap instance when available', () => {
    const { adapter } = setup()
    const snap = { setSnapLayers: jest.fn() }
    getSnapInstance.mockReturnValue(snap)

    adapter.setSnapLayers(['a', 'b'])
    expect(snap.setSnapLayers).toHaveBeenCalledWith(['a', 'b'])
  })

  test('stashes pending layers when the instance is not ready', () => {
    const { adapter, map } = setup()
    getSnapInstance.mockReturnValue(null)

    adapter.setSnapLayers(['a'])
    expect(map._pendingSnapLayers).toEqual(['a'])
  })

  test('does nothing when there is no instance and no layers', () => {
    const { adapter, map } = setup()
    getSnapInstance.mockReturnValue(null)

    adapter.setSnapLayers(null)
    expect(map._pendingSnapLayers).toBeUndefined()
  })
})

describe('_handleModeChange', () => {
  test('clears the snap indicator when leaving to a non-draw mode', () => {
    const { map } = setup()
    const snap = { id: 'snap' }
    getSnapInstance.mockReturnValue(snap)

    onHandler(map, MAPBOX_DRAW_EVENTS.MODE_CHANGE)({ mode: 'simple_select' })

    expect(clearSnapIndicator).toHaveBeenCalledWith(snap, map)
  })

  test('keeps the snap indicator while in a draw mode', () => {
    const { map } = setup()
    onHandler(map, MAPBOX_DRAW_EVENTS.MODE_CHANGE)({ mode: 'draw_polygon' })
    expect(clearSnapIndicator).not.toHaveBeenCalled()
  })

  test('keeps the snap indicator while in edit_vertex mode', () => {
    const { map } = setup()
    onHandler(map, MAPBOX_DRAW_EVENTS.MODE_CHANGE)({ mode: 'edit_vertex' })
    expect(clearSnapIndicator).not.toHaveBeenCalled()
  })
})

describe('_handleStyleData', () => {
  test('does nothing when there are no layers', () => {
    const { map } = setup()
    map.getStyle.mockReturnValue({ layers: undefined })
    onHandler(map, STYLE_DATA_EVENT)()
    expect(map.moveLayer).not.toHaveBeenCalled()
  })

  test('does nothing when a draw layer is already on top', () => {
    const { map } = setup()
    map.getStyle.mockReturnValue({ layers: [{ id: 'a', source: 'bg' }, { id: 'd', source: 'mapbox-gl-draw-hot' }] })
    onHandler(map, STYLE_DATA_EVENT)()
    expect(map.moveLayer).not.toHaveBeenCalled()
  })

  test('moves draw layers back to the top when covered', () => {
    const { map } = setup()
    map.getStyle.mockReturnValue({
      layers: [
        { id: 'd1', source: 'mapbox-gl-draw-hot' },
        { id: 'd2', source: 'mapbox-gl-draw-cold' },
        { id: 'top', source: 'other' }
      ]
    })

    onHandler(map, STYLE_DATA_EVENT)()

    expect(map.moveLayer).toHaveBeenCalledWith('d1')
    expect(map.moveLayer).toHaveBeenCalledWith('d2')
    expect(map.moveLayer).not.toHaveBeenCalledWith('top')
  })

  test('tolerates layers without a source', () => {
    const { map } = setup()
    map.getStyle.mockReturnValue({ layers: [{ id: 'd', source: 'mapbox-gl-draw-hot' }, { id: 'nosrc' }] })
    onHandler(map, STYLE_DATA_EVENT)()
    expect(map.moveLayer).toHaveBeenCalledWith('d')
  })

  test('re-asserts a dashed stroke after a style reload resets layer visibility', () => {
    const { adapter, map, draw } = setup()
    draw.getMode.mockReturnValue('draw_polygon')
    map.getLayer.mockReturnValue({})
    // Live check flags a crossing → dashed.
    onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)({ type: 'draw.geometrychange', coordinates: [[[0, 0], [10, 10], [10, 0], [0, 10]]] })
    expect(adapter).toBeDefined()
    // A style reload re-adds the layers with spec defaults (solid visible)…
    map.setLayoutProperty.mockClear()
    onHandler(map, STYLE_DATA_EVENT)()
    // …and the handler re-applies the cached dashed state.
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active-invalid.hot', 'visibility', 'visible')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active.hot', 'visibility', 'none')
  })
})

describe('interface-type normalisation', () => {
  test('draw.interfacetypechange is forwarded onto the adapter bus', () => {
    const { map, bus } = setup()
    onHandler(map, CUSTOM_DRAW_EVENTS.INTERFACE_TYPE_CHANGE)({ interfaceType: 'keyboard' })
    expect(bus.emit).toHaveBeenCalledWith('interfacetypechange', { interfaceType: 'keyboard' })
  })
})

describe('remove', () => {
  test('unsubscribes from every event and cleans up the draw control', () => {
    const { adapter, map, removeDraw } = setup()

    adapter.remove()

    const unsubscribed = map.off.mock.calls.map(([name]) => name)
    expect(unsubscribed).toEqual(expect.arrayContaining([
      MAPBOX_DRAW_EVENTS.CREATE, MAPBOX_DRAW_EVENTS.UPDATE, MAPBOX_DRAW_EVENTS.MODE_CHANGE,
      CUSTOM_DRAW_EVENTS.EDIT_FINISH, CUSTOM_DRAW_EVENTS.CANCEL, CUSTOM_DRAW_EVENTS.VERTEX_SELECTION,
      CUSTOM_DRAW_EVENTS.VERTEX_CHANGE, CUSTOM_DRAW_EVENTS.UNDO_CHANGE, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE,
      STYLE_DATA_EVENT
    ]))
    expect(removeDraw).toHaveBeenCalled()
  })
})
