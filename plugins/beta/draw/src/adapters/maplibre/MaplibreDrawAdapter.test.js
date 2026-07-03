import { createMapboxDraw } from './mapboxDraw.js'
import { getSnapInstance, clearSnapState, clearSnapIndicator } from './utils/snapHelpers.js'
import { createEventBus } from '../../utils/eventBus.js'
import { MAPBOX_DRAW_EVENTS, CUSTOM_DRAW_EVENTS, STYLE_DATA_EVENT } from './drawEvents.js'
import { MaplibreDrawAdapter } from './MaplibreDrawAdapter.js'

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
  test('clears the snap indicator when leaving a draw mode', () => {
    const { map } = setup()
    const snap = { id: 'snap' }
    getSnapInstance.mockReturnValue(snap)

    onHandler(map, MAPBOX_DRAW_EVENTS.MODE_CHANGE)({ mode: 'edit_vertex' })

    expect(clearSnapIndicator).toHaveBeenCalledWith(snap, map)
  })

  test('keeps the snap indicator while in a draw mode', () => {
    const { map } = setup()
    onHandler(map, MAPBOX_DRAW_EVENTS.MODE_CHANGE)({ mode: 'draw_polygon' })
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
