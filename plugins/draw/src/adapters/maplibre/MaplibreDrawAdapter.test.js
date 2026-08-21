import { createMapboxDraw } from './mapboxDraw.js'
import { getSnapInstance, clearSnapState, clearSnapIndicator } from './utils/snapHelpers.js'
import { createEventBus } from '../../utils/eventBus.js'
import { resolvePointSymbol, hasSymbolStyle } from './pointSymbolImages.js'
import { createFeatureLayerGroup, removeFeatureLayerGroup, setFeatureLayerGroupData } from './featureLayerGroup.js'
import { applyLayerOrder, ensureAnchorLayer } from './layerOrder.js'
import { MAPBOX_DRAW_EVENTS, CUSTOM_DRAW_EVENTS, STYLE_DATA_EVENT } from './drawEvents.js'
import { MaplibreDrawAdapter, displayedShape } from './MaplibreDrawAdapter.js'

jest.mock('./mapboxDraw.js', () => ({ createMapboxDraw: jest.fn() }))
jest.mock('./utils/snapHelpers.js', () => ({
  getSnapInstance: jest.fn(),
  clearSnapState: jest.fn(),
  clearSnapIndicator: jest.fn()
}))
jest.mock('../../utils/eventBus.js', () => ({ createEventBus: jest.fn() }))
jest.mock('./pointSymbolImages.js', () => ({
  resolvePointSymbol: jest.fn(),
  refreshAllPointSymbols: jest.fn(),
  hasSymbolStyle: jest.fn()
}))
// Own test coverage lives in featureLayerGroup.test.js / layerOrder.test.js — mocked here so
// this file tests only the adapter's own orchestration of them.
jest.mock('./featureLayerGroup.js', () => ({
  createFeatureLayerGroup: jest.fn(),
  removeFeatureLayerGroup: jest.fn(),
  setFeatureLayerGroupData: jest.fn(),
  getSourceId: jest.fn((id) => `draw-${id}`),
  getFeatureLayerIds: jest.fn((id, geometryType) => {
    if (geometryType === 'Polygon') { return [`draw-${id}-line`, `draw-${id}-fill`] }
    if (geometryType === 'LineString') { return [`draw-${id}-line`] }
    return [`draw-${id}-symbol`]
  })
}))
jest.mock('./layerOrder.js', () => ({
  applyLayerOrder: jest.fn(),
  ensureAnchorLayer: jest.fn(),
  isDrawOwnedLayerId: jest.fn((id) => id.startsWith('draw-')),
  ANCHOR_ID: 'draw-anchor'
}))

const SNAP_LAYER = 'snap-helper-circle'

const onHandler = (map, event) => map.on.mock.calls.find(([name]) => name === event)?.[1]

const setup = () => {
  const sources = new Map()
  const layers = new Set()
  const map = {
    on: jest.fn(),
    off: jest.fn(),
    fire: jest.fn(),
    getLayer: jest.fn((id) => layers.has(id) ? {} : null),
    setLayoutProperty: jest.fn(),
    getStyle: jest.fn(() => ({ layers: [] })),
    moveLayer: jest.fn(),
    addSource: jest.fn((id, def) => sources.set(id, { setData: jest.fn(), _def: def })),
    getSource: jest.fn((id) => sources.get(id)),
    removeSource: jest.fn((id) => sources.delete(id)),
    addLayer: jest.fn((layer) => layers.add(layer.id)),
    removeLayer: jest.fn((id) => layers.delete(id)),
    _drawCurrentMapStyle: { id: 'outdoor' }
  }
  const undoStack = { clear: jest.fn() }
  const mapProvider = { map, undoStack, snapEnabled: false }
  const draw = {
    changeMode: jest.fn(),
    getMode: jest.fn(() => 'disabled'),
    get: jest.fn((id) => ({ id })),
    getAll: jest.fn(() => ({ features: [] })),
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
      snapLayers: ['layer-a'],
      pluginConfig: {},
      pointStore: expect.any(Object)
    })
  })

  test('forwards a provided pluginConfig through to createMapboxDraw', () => {
    const map = {
      on: jest.fn(),
      off: jest.fn(),
      fire: jest.fn(),
      getLayer: jest.fn(() => null),
      setLayoutProperty: jest.fn(),
      getStyle: jest.fn(() => ({ layers: [] })),
      moveLayer: jest.fn()
    }
    const mapProvider = { map, undoStack: { clear: jest.fn() }, snapEnabled: false }
    createMapboxDraw.mockReturnValue({ draw: { changeMode: jest.fn(), getMode: jest.fn() }, remove: jest.fn() })
    createEventBus.mockReturnValue({ on: jest.fn(), off: jest.fn(), emit: jest.fn() })

    const pluginConfig = { shapeStroke: '#custom' }
    // eslint-disable-next-line no-new
    new MaplibreDrawAdapter(mapProvider, {
      mapStyle: 'light',
      events: { MAP_SET_STYLE: 'mss' },
      eventBus: { on: jest.fn() },
      snapLayers: ['layer-a'],
      pluginConfig
    })

    expect(createMapboxDraw).toHaveBeenCalledWith(expect.objectContaining({ pluginConfig }))
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
    const e = { phase: 'place', reason: 'outside region' }
    onHandler(map, CUSTOM_DRAW_EVENTS.PLACEMENT_BLOCKED)(e)
    expect(bus.emit).toHaveBeenCalledWith('placementblocked', e)
  })
})

describe('displayedShape helper', () => {
  test('builds a polygon feature from draw_polygon mode', () => {
    const result = displayedShape('draw_polygon', [[[0, 0], [10, 0], [10, 10], [0, 0]]])
    expect(result?.feature?.type).toBe('Feature')
    expect(result?.feature?.geometry?.type).toBe('Polygon')
    expect(result?.numVertices).toBe(3)
  })

  test('builds a line feature from draw_line mode', () => {
    const result = displayedShape('draw_line', [[0, 0], [10, 0], [10, 10]])
    expect(result?.feature?.type).toBe('Feature')
    expect(result?.feature?.geometry?.type).toBe('LineString')
    expect(result?.numVertices).toBe(2)
  })

  test('detects polygon vs line in edit_vertex mode from coordinate nesting', () => {
    const polygon = displayedShape('edit_vertex', [[[0, 0], [10, 0], [10, 10], [0, 0]]])
    expect(polygon?.feature?.geometry?.type).toBe('Polygon')
    const line = displayedShape('edit_vertex', [[0, 0], [10, 0], [10, 10]])
    expect(line?.feature?.geometry?.type).toBe('LineString')
  })

  test('builds a point feature from edit_point mode, with a flat (unnested) coordinate', () => {
    const result = displayedShape('edit_point', [5, 5])
    expect(result?.feature?.type).toBe('Feature')
    expect(result?.feature?.geometry).toEqual({ type: 'Point', coordinates: [5, 5] })
    expect(result?.numVertices).toBe(1)
  })

  test('returns null for an unknown mode', () => {
    expect(displayedShape('unknown_mode', [[0, 0], [10, 0]])).toBeNull()
  })

  // A ring/coordinate array can transiently be empty/absent right as a sketch starts —
  // the `?? …` fallbacks keep numVertices a sane number instead of crashing on `undefined.length`.
  test('falls back to numVertices 0 for a draw_polygon sketch with no ring yet', () => {
    expect(displayedShape('draw_polygon', [])?.numVertices).toBe(0)
  })

  test('falls back to numVertices 0 for a draw_line sketch with no coordinates yet', () => {
    expect(displayedShape('draw_line', undefined)?.numVertices).toBe(0)
  })

  test('falls back to numVertices 0 for an edit_vertex polygon with no ring yet', () => {
    const result = displayedShape('edit_vertex', [])
    expect(result?.feature?.geometry?.type).toBe('LineString') // coordinates[0] undefined → not detected as a polygon ring
    expect(result?.numVertices).toBe(0)
  })

  // A plain object (not an array) still satisfies edit_vertex's own coordinates[0]?.[0]
  // access without throwing, but has no .length of its own — the line branch's `?? 0`
  // fallback the case above can't reach (an empty array's .length is 0, not nullish).
  test('falls back to numVertices 0 for an edit_vertex line whose coordinates have no length at all', () => {
    const result = displayedShape('edit_vertex', {})
    expect(result?.feature?.geometry?.type).toBe('LineString')
    expect(result?.numVertices).toBe(0)
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

  test('commit-level (has a phase) events do not drive the stroke; events.js owns those', () => {
    const { map } = drawPolygonSetup()
    onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)({ feature: bowtie, phase: 'commit-add', vertexIndex: 3 })
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

  test('the user callback runs ONCE per frame in draw mode, with phase preview, driving both the stroke and Add point from that single call', () => {
    jest.useFakeTimers()
    const { map, bus } = drawPolygonSetup()
    map._drawGeometryValidator = jest.fn(() => ({ valid: false, reason: 'outside region' }))
    const fire = onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)
    fire(square)
    expect(map._drawGeometryValidator).not.toHaveBeenCalled() // deferred to the frame
    jest.runAllTimers()
    expect(map._drawGeometryValidator).toHaveBeenCalledTimes(1) // not once per gate
    expect(map._drawGeometryValidator).toHaveBeenCalledWith(expect.objectContaining({ phase: 'preview' }))
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active-invalid.hot', 'visibility', 'visible')
    expect(bus.emit).toHaveBeenCalledWith('canplacechange', expect.objectContaining({ canPlace: false, reason: 'outside region' }))
    jest.useRealTimers()
  })

  test('the user callback runs even before any vertex is placed, gating both the stroke and Add point from the very first candidate point', () => {
    jest.useFakeTimers()
    const { map, bus } = drawPolygonSetup()
    map._drawGeometryValidator = jest.fn(() => ({ valid: false, reason: 'outside region' }))
    const fire = onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)
    // Zero committed vertices — coordinates is just the rubber-band cursor point.
    fire({ type: 'draw.geometrychange', coordinates: [[[5, 5]]] })
    jest.runAllTimers()
    expect(map._drawGeometryValidator).toHaveBeenCalledWith(expect.objectContaining({ numVertices: 0, phase: 'preview' }))
    expect(bus.emit).toHaveBeenCalledWith('canplacechange', expect.objectContaining({ canPlace: false, reason: 'outside region' }))
    expect(map.setLayoutProperty).toHaveBeenCalledWith('stroke-active-invalid.hot', 'visibility', 'visible')
    jest.useRealTimers()
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

  test('validity flips also gate the Done button while editing a point', () => {
    jest.useFakeTimers()
    const { map, draw, bus } = editSetup()
    draw.getMode.mockReturnValue('edit_point')
    const fire = onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)
    map._drawGeometryValidator = () => ({ valid: false, reason: 'outside region' })
    fire({ type: 'draw.geometrychange', coordinates: [5, 5] })
    jest.runAllTimers()
    expect(bus.emit).toHaveBeenCalledWith('validitychange', expect.objectContaining({ valid: false, reason: 'outside region' }))
    jest.useRealTimers()
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

  test('records the editing feature id when entering edit_point', () => {
    const { adapter, draw } = setup()
    adapter.changeMode('edit_point', { featureId: 'f9' })
    expect(draw.changeMode).toHaveBeenCalledWith('edit_point', { featureId: 'f9' })
  })

  test('defaults the editing feature id to null when omitted', () => {
    const { adapter, draw } = setup()
    adapter.changeMode('edit_vertex', {})
    draw.getMode.mockReturnValue('edit_vertex')
    adapter.done()
    // no editing feature id → no editfinish fired
    expect(draw.changeMode).toHaveBeenCalledWith('edit_vertex', {})
  })

  test('entering edit_vertex/edit_point with a featureId pulls a committed feature into the draw control first', () => {
    const { adapter, draw } = setup()
    const feature = { id: 'f9', geometry: { type: 'Polygon', coordinates: [[]] }, properties: {} }
    adapter.commitFeature(feature)

    adapter.changeMode('edit_vertex', { featureId: 'f9' })

    expect(draw.add).toHaveBeenCalledWith(feature)
    // _order still holds its slot (so it resumes the same stacking position on return from
    // edit) even though it's no longer in the committed registry during the session.
    expect(adapter.getOrder()).toContain('f9')
  })

  test('a featureId that is not committed is a safe no-op', () => {
    const { adapter, draw } = setup()
    adapter.changeMode('edit_point', { featureId: 'missing' })
    expect(draw.add).not.toHaveBeenCalled()
  })

  test('passes through non-edit modes with default options', () => {
    const { adapter, draw } = setup()
    adapter.changeMode('draw_polygon')
    expect(draw.changeMode).toHaveBeenCalledWith('draw_polygon', {})
  })

  test('draw_point gets a resolvePointSymbol hook injected, delegating to pointSymbolImages.js', () => {
    const { adapter, draw, map, mapProvider } = setup()
    adapter.changeMode('draw_point', { featureId: 'p1' })

    expect(draw.changeMode).toHaveBeenCalledWith('draw_point', {
      featureId: 'p1',
      resolvePointSymbol: expect.any(Function)
    })

    const injected = draw.changeMode.mock.calls[0][1].resolvePointSymbol
    injected('p1', { symbol: 'pin' })
    expect(resolvePointSymbol).toHaveBeenCalledWith({ store: adapter._pointStore, mapProvider, map, featureId: 'p1', properties: { symbol: 'pin' } })
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

  test('nudgeSelectedVertex fires the nudge-vertex event with the given delta and step size', () => {
    const { adapter, map } = setup()
    adapter.nudgeSelectedVertex(1, 0, true)
    expect(map.fire).toHaveBeenCalledWith(CUSTOM_DRAW_EVENTS.NUDGE_VERTEX, { dx: 1, dy: 0, isLargeStep: true })
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
    adapter.delete('c')
    adapter.deleteAll()
    adapter.setFeatureProperty('d', 'p', 1)

    expect(draw.get).toHaveBeenCalledWith('a')
    expect(draw.delete).toHaveBeenCalledWith('c')
    expect(draw.deleteAll).toHaveBeenCalled()
    expect(draw.setFeatureProperty).toHaveBeenCalledWith('d', 'p', 1)
  })

  // A directly-added Point skips draw_point's own icon-resolving drawend handler.
  describe('add() and point symbol resolution', () => {
    test('resolves the symbol using the feature\'s own id, not one draw.add() would have assigned', () => {
      const { adapter, map, mapProvider } = setup()
      hasSymbolStyle.mockReturnValue(true)
      const feature = { id: 'p1', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { symbol: 'pin' } }

      const result = adapter.add(feature)

      expect(hasSymbolStyle).toHaveBeenCalledWith({ symbol: 'pin' })
      expect(resolvePointSymbol).toHaveBeenCalledWith({
        store: adapter._pointStore, mapProvider, map, featureId: 'p1', properties: { symbol: 'pin' }
      })
      expect(result).toEqual(['p1'])
    })

    test('does not attempt resolution for a Point with no symbol properties', () => {
      const { adapter } = setup()
      hasSymbolStyle.mockReturnValue(false)
      adapter.add({ id: 'p1', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} })
      expect(resolvePointSymbol).not.toHaveBeenCalled()
    })

    test('does not attempt resolution for a non-Point geometry', () => {
      const { adapter } = setup()
      adapter.add({ id: 'a', geometry: { type: 'Polygon', coordinates: [[]] }, properties: { symbol: 'pin' } })
      expect(hasSymbolStyle).not.toHaveBeenCalled()
      expect(resolvePointSymbol).not.toHaveBeenCalled()
    })

    test('does not attempt resolution for a feature with no geometry', () => {
      const { adapter } = setup()
      adapter.add({ id: 'b' })
      expect(resolvePointSymbol).not.toHaveBeenCalled()
    })
  })

  describe('commitFeature() — own layer group, deterministic stacking', () => {
    test('creates the layer group, deletes any mapbox-gl-draw copy, and tracks it as committed', () => {
      const { adapter, draw, map } = setup()
      const feature = { id: 'a', geometry: { type: 'Polygon', coordinates: [[]] }, properties: {} }

      adapter.commitFeature(feature)

      expect(draw.delete).toHaveBeenCalledWith('a')
      expect(createFeatureLayerGroup).toHaveBeenCalledWith(expect.objectContaining({ map, feature, beforeId: 'draw-anchor' }))
      expect(adapter.get('a')).toBe(feature)
      expect(adapter.getOrder()).toEqual(['a'])
    })

    // Regression test: the anchor is otherwise only ever created lazily by the debounced order
    // resync — on the very first commit it doesn't exist yet, so inserting a layer before it
    // (beforeId: 'draw-anchor') threw immediately in production. Must be created synchronously,
    // before createFeatureLayerGroup runs, not after.
    test('ensures the anchor layer exists before creating a feature\'s layer group, not after', () => {
      const { adapter } = setup()
      const callOrder = []
      ensureAnchorLayer.mockImplementation(() => callOrder.push('ensureAnchorLayer'))
      createFeatureLayerGroup.mockImplementation(() => callOrder.push('createFeatureLayerGroup'))

      adapter.commitFeature({ id: 'a', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} })

      expect(callOrder).toEqual(['ensureAnchorLayer', 'createFeatureLayerGroup'])
    })

    test('schedules a debounced resync — a burst of commits in one frame resyncs once', () => {
      const raf = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => { raf.cb = cb; return 1 })
      const { adapter } = setup()
      adapter.commitFeature({ id: 'a', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} })
      adapter.commitFeature({ id: 'b', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} })
      expect(raf).toHaveBeenCalledTimes(1)
      raf.cb()
      expect(applyLayerOrder).toHaveBeenCalledTimes(1)
      raf.mockRestore()
    })

    test('removeCommittedFeature removes the layer group and untracks it; no-ops for an unknown id', () => {
      const { adapter, map } = setup()
      const feature = { id: 'a', geometry: { type: 'LineString', coordinates: [] }, properties: {} }
      adapter.commitFeature(feature)

      adapter.removeCommittedFeature('a')
      expect(removeFeatureLayerGroup).toHaveBeenCalledWith({ map, featureId: 'a', geometryType: 'LineString' })
      expect(adapter.getOrder()).toEqual([])

      removeFeatureLayerGroup.mockClear()
      adapter.removeCommittedFeature('missing')
      expect(removeFeatureLayerGroup).not.toHaveBeenCalled()
    })

    test('get() checks the committed registry before falling back to the draw control', () => {
      const { adapter, draw } = setup()
      const committed = { id: 'a', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} }
      adapter.commitFeature(committed)
      draw.get.mockReturnValue({ id: 'mid-edit' })

      expect(adapter.get('a')).toBe(committed)
      expect(adapter.get('other')).toEqual({ id: 'mid-edit' })
    })

    // resolvePointSymbol/refreshAllPointSymbols are mocked elsewhere in this file, so this is
    // the only place _pointStore's own methods (as opposed to the equivalent logic reachable
    // via get()/setStyle()) actually get invoked.
    test('_pointStore reads/writes whichever registry a feature is currently in', () => {
      const { adapter, draw, map } = setup()
      const committed = { id: 'a', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} }
      adapter.commitFeature(committed)
      draw.getAll.mockReturnValue({ features: [{ id: 'mid-edit' }] })

      expect(adapter._pointStore.get('a')).toBe(committed)
      expect(adapter._pointStore.getAll()).toEqual([committed, { id: 'mid-edit' }])

      const updatedCommitted = { ...committed, properties: { symbol: 'pin' } }
      adapter._pointStore.write(updatedCommitted)
      expect(setFeatureLayerGroupData).toHaveBeenCalledWith({ map, featureId: 'a', feature: updatedCommitted })
      expect(adapter.get('a')).toBe(updatedCommitted)

      const midEditFeature = { id: 'mid-edit', properties: { symbol: 'pin' } }
      adapter._pointStore.write(midEditFeature)
      expect(draw.add).toHaveBeenCalledWith(midEditFeature)
    })
  })

  describe('edit-session lifecycle for a committed feature', () => {
    test('beginEditFromOwnLayers empties the source, un-commits it, and hands it to the draw control', () => {
      const { adapter, draw, map } = setup()
      const feature = { id: 'a', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} }
      adapter.commitFeature(feature)
      draw.get.mockReturnValue({ id: 'a', mid: 'edit' })

      const result = adapter.beginEditFromOwnLayers('a')

      expect(setFeatureLayerGroupData).toHaveBeenCalledWith({ map, featureId: 'a' })
      expect(draw.add).toHaveBeenCalledWith(feature)
      expect(result).toBe(true)
      // No longer committed — get() must read the live, mid-edit copy from the draw control.
      expect(adapter.get('a')).toEqual({ id: 'a', mid: 'edit' })
    })

    test('beginEditFromOwnLayers returns false for an id that is not committed', () => {
      const { adapter } = setup()
      expect(adapter.beginEditFromOwnLayers('missing')).toBe(false)
    })

    // Ending a session needs nothing ML-specific by name — events.js's existing Done/Cancel
    // paths already just call the generic add(), which detects the still-existing (emptied,
    // never removed) layer group and refreshes it instead of recreating it from scratch.
    test('add() detects an existing layer group on return from edit and refreshes it instead of recreating it', () => {
      const { adapter, draw, map } = setup()
      const original = { id: 'a', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} }
      map.addSource('draw-a', {}) // simulates the layer group createFeatureLayerGroup would have made
      adapter.commitFeature(original)
      createFeatureLayerGroup.mockClear()

      const edited = { ...original, geometry: { type: 'Point', coordinates: [1, 1] } }
      adapter.add(edited)

      expect(createFeatureLayerGroup).not.toHaveBeenCalled()
      expect(setFeatureLayerGroupData).toHaveBeenCalledWith({ map, featureId: 'a', feature: edited })
      expect(draw.delete).toHaveBeenCalledWith('a')
      expect(adapter.get('a')).toBe(edited)
    })
  })

  describe('stacking order methods', () => {
    test('getOrder returns a copy; each move method mutates order and resyncs synchronously', () => {
      const { adapter } = setup()
      const point = (id) => ({ id, geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} })
      adapter.commitFeature(point('a'))
      adapter.commitFeature(point('b'))
      adapter.commitFeature(point('c'))
      applyLayerOrder.mockClear()

      const order = adapter.getOrder()
      order.push('intruder')
      expect(adapter.getOrder()).toEqual(['a', 'b', 'c'])

      adapter.moveToFront('a')
      expect(adapter.getOrder()).toEqual(['b', 'c', 'a'])
      adapter.moveToBack('c')
      expect(adapter.getOrder()).toEqual(['c', 'b', 'a'])
      adapter.moveForward('c')
      expect(adapter.getOrder()).toEqual(['b', 'c', 'a'])
      adapter.moveBackward('a')
      expect(adapter.getOrder()).toEqual(['b', 'a', 'c'])
      // Synchronous, not debounced — no requestAnimationFrame needed to observe it.
      expect(applyLayerOrder).toHaveBeenCalledTimes(4)
    })
  })

  describe('getCommittedFeatureLayerIds()', () => {
    test('resolves every committed feature to its own concrete layer ids, by geometry type', () => {
      const { adapter } = setup()
      adapter.commitFeature({ id: 'poly1', geometry: { type: 'Polygon', coordinates: [] }, properties: {} })
      adapter.commitFeature({ id: 'line1', geometry: { type: 'LineString', coordinates: [] }, properties: {} })
      adapter.commitFeature({ id: 'pt1', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} })

      expect(adapter.getCommittedFeatureLayerIds().sort()).toEqual([
        'draw-line1-line', 'draw-poly1-fill', 'draw-poly1-line', 'draw-pt1-symbol'
      ].sort())
    })

    test('returns an empty array when nothing is committed', () => {
      const { adapter } = setup()
      expect(adapter.getCommittedFeatureLayerIds()).toEqual([])
    })
  })

  describe('setStyle()', () => {
    test('merges the patch into the existing feature and re-adds it', () => {
      const { adapter, draw } = setup()
      const feature = { id: 'a', type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] }, properties: { stroke: 'red', name: 'x' } }
      draw.get.mockReturnValue(feature)
      draw.add.mockReturnValue(['a'])

      adapter.setStyle('a', { stroke: 'blue' })

      expect(draw.add).toHaveBeenCalledWith({
        id: 'a',
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[]] },
        properties: { stroke: 'blue', name: 'x' }
      })
    })

    // setStyle is routed through add() itself, so a Point patched with symbol properties gets
    // its icon re-resolved the same way a directly-added one does.
    test('re-resolves the icon for a Point patched with symbol properties', () => {
      const { adapter, draw } = setup()
      const feature = { id: 'p1', type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { symbol: 'pin' } }
      draw.get.mockReturnValue(feature)
      draw.add.mockReturnValue(['p1'])
      hasSymbolStyle.mockReturnValue(true)

      adapter.setStyle('p1', { symbolBackgroundColor: '#ca3535' })

      expect(resolvePointSymbol).toHaveBeenCalledWith(expect.objectContaining({
        featureId: 'p1',
        properties: { symbol: 'pin', symbolBackgroundColor: '#ca3535' }
      }))
    })

    test('does nothing for an id with no existing feature', () => {
      const { adapter, draw } = setup()
      draw.get.mockReturnValue(undefined)
      adapter.setStyle('missing', { stroke: 'blue' })
      expect(draw.add).not.toHaveBeenCalled()
    })

    test('a committed feature routes through add(), not the draw control directly', () => {
      const { adapter, draw } = setup()
      const feature = { id: 'a', geometry: { type: 'Polygon', coordinates: [[]] }, properties: { stroke: 'red' } }
      adapter.commitFeature(feature)

      adapter.setStyle('a', { stroke: 'blue' })

      expect(draw.add).not.toHaveBeenCalled()
      expect(createFeatureLayerGroup).toHaveBeenCalledWith(expect.objectContaining({
        feature: expect.objectContaining({ properties: { stroke: 'blue' } })
      }))
      expect(adapter.get('a').properties).toEqual({ stroke: 'blue' })
    })
  })

  test('setDrawingPreviewProperty tags the in-progress feature and re-renders', () => {
    const { adapter, map } = setup()
    const render = jest.fn()
    const drawEvent = { coordinates: [[0, 0], [1, 1]], properties: {}, ctx: { store: { render } } }
    // Phase-less events are rubber-band moves — cached so setDrawingPreviewProperty
    // has something to tag (the in-progress feature has no id yet to look up).
    onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)(drawEvent)

    adapter.setDrawingPreviewProperty('splitter', 'valid')

    expect(drawEvent.properties.splitter).toBe('valid')
    expect(render).toHaveBeenCalled()
  })

  test('setDrawingPreviewProperty tolerates nothing having been drawn yet', () => {
    const { adapter } = setup()
    expect(() => adapter.setDrawingPreviewProperty('splitter', 'valid')).not.toThrow()
  })

  test('setDrawingPreviewProperty ignores commit-level (has a phase) events', () => {
    const { adapter, map } = setup()
    const render = jest.fn()
    // A commit event (has a phase) must not become the cached preview target — it
    // carries a `feature`, not the live `properties` object rubber-band moves do.
    onHandler(map, CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE)({ feature: {}, phase: 'commit-add', ctx: { store: { render } } })

    expect(() => adapter.setDrawingPreviewProperty('splitter', 'valid')).not.toThrow()
    expect(render).not.toHaveBeenCalled()
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

  test('clears the undo stack and fires editfinish when editing a point', () => {
    const { adapter, map, draw, undoStack } = setup()
    adapter.changeMode('edit_point', { featureId: 'f1' })
    draw.getMode.mockReturnValue('edit_point')

    adapter.done()

    expect(undoStack.clear).toHaveBeenCalled()
    expect(map.fire).toHaveBeenCalledWith(CUSTOM_DRAW_EVENTS.EDIT_FINISH, { features: [{ id: 'f1' }] })
    expect(draw.changeMode).not.toHaveBeenCalledWith('disabled')
  })
})

describe('cancel', () => {
  test('cancelling an in-progress draw clears the undo stack, trashes the sketch and disables the control', () => {
    const { adapter, draw, undoStack } = setup()
    draw.getMode.mockReturnValue('draw_polygon')
    adapter.cancel()
    expect(undoStack.clear).toHaveBeenCalled()
    expect(draw.trash).toHaveBeenCalled()
    expect(draw.changeMode).toHaveBeenCalledWith('disabled')
  })

  test('cancelling a draw_line session also trashes the sketch', () => {
    const { adapter, draw } = setup()
    draw.getMode.mockReturnValue('draw_line')
    adapter.cancel()
    expect(draw.trash).toHaveBeenCalled()
  })

  // Regression: events.js's handleCancel already restores the original feature
  // via draw.add() before calling this. trash() runs mapbox-gl-draw's
  // direct_select onTrash handler, which operates on the mode's own live
  // state — removing the selected vertex or (if the in-progress edit left the
  // shape invalid) deleting the whole feature — silently discarding the
  // just-restored original. See MaplibreDrawAdapter.js's cancel() comment.
  test('cancelling an edit session does NOT trash — the restored feature must survive', () => {
    const { adapter, draw, undoStack } = setup()
    draw.getMode.mockReturnValue('edit_vertex')
    adapter.cancel()
    expect(undoStack.clear).toHaveBeenCalled()
    expect(draw.trash).not.toHaveBeenCalled()
    expect(draw.changeMode).toHaveBeenCalledWith('disabled')
  })

  test('cancelling with no active session (disabled mode) does not trash', () => {
    const { adapter, draw } = setup()
    adapter.cancel()
    expect(draw.trash).not.toHaveBeenCalled()
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
  test('rebuilds every committed feature\'s layer group when a reload has wiped the anchor', () => {
    const { adapter, map } = setup()
    const feature = { id: 'a', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} }
    adapter.commitFeature(feature)
    createFeatureLayerGroup.mockClear()
    applyLayerOrder.mockClear()
    map.getLayer.mockReturnValue(null) // simulate the reload having wiped the anchor
    map.getStyle.mockReturnValue({ layers: [] })

    onHandler(map, STYLE_DATA_EVENT)({ dataType: 'style' })

    expect(createFeatureLayerGroup).toHaveBeenCalledWith(expect.objectContaining({ feature, beforeId: 'draw-anchor' }))
    expect(applyLayerOrder).toHaveBeenCalled()
  })

  // Our own addSource/addLayer calls fire this same event tagged dataType: 'source', never
  // 'style' — confirms they can never trigger a rebuild, regardless of whether the anchor
  // happens to be transiently absent (e.g. during the very first commit, before the debounced
  // order resync has had a chance to create it) — the actual root cause of the production bug,
  // which the reentrancy guard alone (below) didn't fully cover.
  test('a dataType: "source" event (our own addSource/addLayer) never triggers a rebuild', () => {
    const { adapter, map } = setup()
    const feature = { id: 'a', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} }
    adapter.commitFeature(feature)
    createFeatureLayerGroup.mockClear()
    map.getLayer.mockReturnValue(null)
    map.getStyle.mockReturnValue({ layers: [] })

    onHandler(map, STYLE_DATA_EVENT)({ dataType: 'source' })

    expect(createFeatureLayerGroup).not.toHaveBeenCalled()
  })

  // Regression test: MapLibre's own map.addSource()/addLayer() fire a synchronous styledata
  // event of their own, re-entering this handler before the outer forEach loop has finished —
  // without a reentrancy guard, the reentrant call also sees the anchor as still missing and
  // tries to recreate the same feature's layer group a second time, throwing on the duplicate
  // source (exactly the crash reported in production).
  test('a styledata event fired synchronously by our own addSource call does not re-enter and double-create', () => {
    const { adapter, map } = setup()
    const featureA = { id: 'a', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} }
    const featureB = { id: 'b', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} }
    adapter.commitFeature(featureA)
    adapter.commitFeature(featureB)
    createFeatureLayerGroup.mockClear()
    map.getLayer.mockReturnValue(null) // simulate the reload having wiped the anchor
    map.getStyle.mockReturnValue({ layers: [] })

    const handler = onHandler(map, STYLE_DATA_EVENT)
    // Reentrant call carries dataType: 'source' (our own addSource), like the real bug —
    // confirms the guard holds even when the dataType filter alone wouldn't have caught it.
    createFeatureLayerGroup.mockImplementation(() => { handler({ dataType: 'source' }) })

    expect(() => handler({ dataType: 'style' })).not.toThrow()
    expect(createFeatureLayerGroup).toHaveBeenCalledTimes(2) // once per feature, not doubled
  })

  test('does not attempt a rebuild when nothing is committed, even on a genuine reload', () => {
    const { map } = setup()
    map.getLayer.mockReturnValue(null)
    map.getStyle.mockReturnValue({ layers: [] })
    onHandler(map, STYLE_DATA_EVENT)({ dataType: 'style' })
    expect(createFeatureLayerGroup).not.toHaveBeenCalled()
  })

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
