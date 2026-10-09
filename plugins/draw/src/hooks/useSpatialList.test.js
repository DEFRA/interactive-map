import { renderHook, act } from '@testing-library/react'
import { useSpatialList } from './useSpatialList.js'
import { createSpatialListRegistry } from '../../../../src/App/registry/spatialListRegistry.js'
import { ADAPTER_EVENTS } from '../adapterEvents.js'

const SET_FEATURES = 'map:setspatiallist'
const SET_ACTIVE = 'map:setactiveitem'
const CONFIRM = 'map:selectitem'
const MOVE_END = 'map:moveend'

const vertexItem = (overrides) => expect.objectContaining({ isMidpoint: false, ...overrides })
const midpointItem = (overrides) => expect.objectContaining({ isMidpoint: true, ...overrides })

const makeEventBus = () => {
  const listeners = {}
  return {
    on: jest.fn((eventName, fn) => { listeners[eventName] = fn }),
    off: jest.fn(),
    emit: jest.fn((eventName, payload) => listeners[eventName]?.(payload))
  }
}

// A minimal stand-in for the adapter surface useSpatialList.js actually calls
// (getVertexItems/selectVertex/insertVertexAtMidpoint), plus its own on/off/UPDATE bus.
const makeDrawAdapter = ({ vertices = [], midpoints = [] } = {}) => {
  const listeners = {}
  return {
    getVertexItems: jest.fn(() => ({ vertices, midpoints })),
    selectVertex: jest.fn(),
    insertVertexAtMidpoint: jest.fn(),
    on: jest.fn((eventName, fn) => { listeners[eventName] = fn }),
    off: jest.fn(),
    fireUpdate: () => listeners[ADAPTER_EVENTS.UPDATE]?.()
  }
}

const makeMapProvider = (draw) => ({
  draw,
  mapToScreen: jest.fn(() => ({ x: 10, y: 20 }))
})

const makeViewportRef = () => ({ current: { focus: jest.fn() } })

const setup = ({ mode = 'edit_vertex', draw, eventBus, mapSize = 'small', registry, viewportRef, announce } = {}) => {
  const eb = eventBus ?? makeEventBus()
  const adapter = draw ?? makeDrawAdapter()
  const mp = makeMapProvider(adapter)
  const vpRef = viewportRef ?? makeViewportRef()
  const announceSpy = announce ?? jest.fn()
  // A real registry, not a mock — spatialListRegistry.test.js already covers its own
  // aggregation/exclusive-claim behaviour generically; using the real thing here proves this
  // hook actually drives it correctly, same convention as interact's own useSpatialList.test.js.
  const spatialListRegistry = registry ?? createSpatialListRegistry({ eventBus: eb })
  const { result, unmount, rerender } = renderHook(
    ({ mode }) => useSpatialList({
      mapState: { mapSize },
      pluginState: { mode },
      services: { eventBus: eb, announce: announceSpy },
      mapProvider: mp,
      spatialListRegistry,
      viewportRef: vpRef
    }),
    { initialProps: { mode } }
  )
  return { eb, mp, adapter, result, unmount, rerender, spatialListRegistry, viewportRef: vpRef, announce: announceSpy }
}

// ─── useSpatialList — lifecycle ──────────────────────────────────────────

describe('useSpatialList — lifecycle', () => {
  it('registers a "draw" item provider with spatialListRegistry on mount', () => {
    const eb = makeEventBus()
    const spatialListRegistry = createSpatialListRegistry({ eventBus: eb })
    const registerSpy = jest.spyOn(spatialListRegistry, 'registerItemProvider')
    const { unmount } = setup({ eventBus: eb, registry: spatialListRegistry })
    expect(registerSpy).toHaveBeenCalledWith('draw', { getItems: expect.any(Function), exclusive: true })
    unmount()
  })

  it('unregisters the "draw" provider on unmount', () => {
    const eb = makeEventBus()
    const spatialListRegistry = createSpatialListRegistry({ eventBus: eb })
    const unregisterSpy = jest.spyOn(spatialListRegistry, 'unregisterItemProvider')
    const { unmount } = setup({ eventBus: eb, registry: spatialListRegistry })
    unmount()
    expect(unregisterSpy).toHaveBeenCalledWith('draw')
  })

  it('subscribes to the adapter\'s UPDATE event while edit_vertex is active', () => {
    const { adapter, unmount } = setup({ mode: 'edit_vertex' })
    expect(adapter.on).toHaveBeenCalledWith(ADAPTER_EVENTS.UPDATE, expect.any(Function))
    unmount()
    expect(adapter.off).toHaveBeenCalledWith(ADAPTER_EVENTS.UPDATE, expect.any(Function))
  })

  it('is safe when mapProvider.draw does not exist yet', () => {
    const eb = makeEventBus()
    const mp = { draw: null, mapToScreen: jest.fn() }
    expect(() => renderHook(() => useSpatialList({
      mapState: { mapSize: 'small' },
      pluginState: { mode: 'edit_vertex' },
      services: { eventBus: eb },
      mapProvider: mp,
      spatialListRegistry: createSpatialListRegistry({ eventBus: eb })
    }))).not.toThrow()
  })
})

// ─── useSpatialList — item building ──────────────────────────────────────

describe('useSpatialList — item building', () => {
  it('emits no items and label "Shape points" is never surfaced (no claim) outside edit_vertex', () => {
    const eb = makeEventBus()
    setup({ eventBus: eb, mode: 'draw_polygon' })
    // Not the exclusive claimant, so its own empty items don't even reach the emit.
    expect(eb.emit).not.toHaveBeenCalledWith(SET_FEATURES, expect.objectContaining({ label: 'Shape points' }))
  })

  it('builds vertex items — id, "Point N" label, and screen position — on entering edit_vertex', () => {
    const eb = makeEventBus()
    const draw = makeDrawAdapter({ vertices: [[0, 0], [1, 1]], midpoints: [] })
    setup({ eventBus: eb, draw, mode: 'edit_vertex' })
    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, {
      items: [
        vertexItem({ id: '0', label: 'Point 1', x: 10, y: 20 }),
        vertexItem({ id: '1', label: 'Point 2', x: 10, y: 20 })
      ],
      multiselectable: false,
      label: 'Shape points',
      focusable: false
    })
  })

  it('interleaves each midpoint after its vertex, with a flat id continuing the vertex index space', () => {
    const eb = makeEventBus()
    const draw = makeDrawAdapter({ vertices: [[0, 0], [1, 1], [2, 2]], midpoints: [[0.5, 0.5], [1.5, 1.5], [1, 1]] })
    setup({ eventBus: eb, draw, mode: 'edit_vertex' })
    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, {
      items: [
        vertexItem({ id: '0' }),
        midpointItem({ id: '3', label: 'Insert 1-2' }),
        vertexItem({ id: '1' }),
        midpointItem({ id: '4', label: 'Insert 2-3' }),
        vertexItem({ id: '2' }),
        midpointItem({ id: '5', label: 'Insert 3-1' })
      ],
      multiselectable: false,
      label: 'Shape points',
      focusable: false
    })
  })

  it('declares focusable: false — no item is ever a real Tab stop for this list', () => {
    const eb = makeEventBus()
    const draw = makeDrawAdapter({ vertices: [[0, 0]], midpoints: [] })
    setup({ eventBus: eb, draw, mode: 'edit_vertex' })
    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, expect.objectContaining({ focusable: false }))
  })

  it('rebuilds on the adapter\'s UPDATE event (e.g. a vertex was inserted/moved)', () => {
    const eb = makeEventBus()
    const draw = makeDrawAdapter({ vertices: [[0, 0]], midpoints: [] })
    setup({ eventBus: eb, draw, mode: 'edit_vertex' })
    eb.emit.mockClear()

    draw.getVertexItems.mockReturnValue({ vertices: [[0, 0], [1, 1]], midpoints: [] })
    act(() => draw.fireUpdate())

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, expect.objectContaining({
      items: [vertexItem({ id: '0' }), vertexItem({ id: '1' })]
    }))
  })

  it('rebuilds on MAP_MOVE_END (pan/zoom) — the underlying coordinate is unchanged but its screen position moves', () => {
    const eb = makeEventBus()
    const draw = makeDrawAdapter({ vertices: [[0, 0]], midpoints: [] })
    const { mp } = setup({ eventBus: eb, draw, mode: 'edit_vertex' })
    eb.emit.mockClear()

    mp.mapToScreen.mockReturnValue({ x: 99, y: 88 })
    act(() => eb.emit(MOVE_END))

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, expect.objectContaining({
      items: [vertexItem({ id: '0', x: 99, y: 88 })]
    }))
  })

  it('reports no items when leaving edit_vertex for another mode', () => {
    const eb = makeEventBus()
    const draw = makeDrawAdapter({ vertices: [[0, 0]], midpoints: [] })
    const { rerender } = setup({ eventBus: eb, draw, mode: 'edit_vertex' })
    eb.emit.mockClear()

    rerender({ mode: 'disabled' })

    // Once draw releases its exclusive claim (no other provider registered here), the
    // registry has nothing left to emit for — items are simply gone, not merely empty.
    expect(eb.emit).not.toHaveBeenCalledWith(SET_FEATURES, expect.objectContaining({ label: 'Shape points' }))
  })
})

// ─── useSpatialList — exclusive claim ────────────────────────────────────

describe('useSpatialList — exclusive claim', () => {
  it('claims exclusive ownership on entering edit_vertex, excluding an additive provider\'s own items', () => {
    const eb = makeEventBus()
    const registry = createSpatialListRegistry({ eventBus: eb })
    registry.registerItemProvider('interact', { getItems: () => ({ items: [{ id: 'feature-1' }], label: 'Map features' }) })
    const draw = makeDrawAdapter({ vertices: [[0, 0]], midpoints: [] })

    setup({ eventBus: eb, draw, mode: 'edit_vertex', registry })

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, expect.objectContaining({ label: 'Shape points' }))
    const lastEmit = eb.emit.mock.calls.at(-1)[1]
    expect(lastEmit.items.some(i => i.id === 'feature-1')).toBe(false)
  })

  it('releases the claim on leaving edit_vertex, reverting to the additive provider\'s items', () => {
    const eb = makeEventBus()
    const registry = createSpatialListRegistry({ eventBus: eb })
    registry.registerItemProvider('interact', { getItems: () => ({ items: [{ id: 'feature-1' }], label: 'Map features' }) })
    const draw = makeDrawAdapter({ vertices: [[0, 0]], midpoints: [] })

    const { rerender } = setup({ eventBus: eb, draw, mode: 'edit_vertex', registry })
    eb.emit.mockClear()
    rerender({ mode: 'disabled' })

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, { items: [{ id: 'feature-1' }], multiselectable: false, label: 'Map features' })
  })

  it('releases the claim on unmount too', () => {
    const eb = makeEventBus()
    const registry = createSpatialListRegistry({ eventBus: eb })
    registry.registerItemProvider('interact', { getItems: () => ({ items: [{ id: 'feature-1' }], label: 'Map features' }) })
    const draw = makeDrawAdapter({ vertices: [[0, 0]], midpoints: [] })

    const { unmount } = setup({ eventBus: eb, draw, mode: 'edit_vertex', registry })
    eb.emit.mockClear()
    unmount()

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, { items: [{ id: 'feature-1' }], multiselectable: false, label: 'Map features' })
  })
})

// ─── useSpatialList — active item preview (MAP_SET_ACTIVE_ITEM) ─────────

describe('useSpatialList — active item preview', () => {
  it('previews a real vertex via selectVertex, by numeric index', () => {
    const eb = makeEventBus()
    const draw = makeDrawAdapter({ vertices: [[0, 0], [1, 1]], midpoints: [] })
    setup({ eventBus: eb, draw, mode: 'edit_vertex' })
    act(() => eb.emit(SET_ACTIVE, { id: '1' }))
    expect(draw.selectVertex).toHaveBeenCalledWith(1)
  })

  it('previews a midpoint via selectVertex too — preview alone never inserts', () => {
    const eb = makeEventBus()
    const draw = makeDrawAdapter({ vertices: [[0, 0], [1, 1]], midpoints: [[0.5, 0.5]] })
    setup({ eventBus: eb, draw, mode: 'edit_vertex' })
    act(() => eb.emit(SET_ACTIVE, { id: '2' }))
    expect(draw.selectVertex).toHaveBeenCalledWith(2)
    expect(draw.insertVertexAtMidpoint).not.toHaveBeenCalled()
  })

  it('a null id (blur) does not call selectVertex — the selection must survive losing listbox focus', () => {
    const eb = makeEventBus()
    const draw = makeDrawAdapter({ vertices: [[0, 0]], midpoints: [] })
    setup({ eventBus: eb, draw, mode: 'edit_vertex' })
    act(() => eb.emit(SET_ACTIVE, { id: null }))
    expect(draw.selectVertex).not.toHaveBeenCalled()
  })

  it('does nothing outside edit_vertex, even if a stale event arrives', () => {
    const eb = makeEventBus()
    const draw = makeDrawAdapter({ vertices: [[0, 0]], midpoints: [] })
    setup({ eventBus: eb, draw, mode: 'draw_polygon' })
    act(() => eb.emit(SET_ACTIVE, { id: '0' }))
    expect(draw.selectVertex).not.toHaveBeenCalled()
  })
})

// ─── useSpatialList — confirm (MAP_SELECT_ITEM) ──────────────────────────

describe('useSpatialList — confirm', () => {
  it('inserts a vertex when the active item is a midpoint, announces it, and hands focus back to the viewport', () => {
    const eb = makeEventBus()
    const draw = makeDrawAdapter({ vertices: [[0, 0], [1, 1]], midpoints: [[0.5, 0.5]] })
    const { viewportRef, announce } = setup({ eventBus: eb, draw, mode: 'edit_vertex' })
    act(() => eb.emit(SET_ACTIVE, { id: '2' })) // the midpoint
    act(() => eb.emit(CONFIRM))
    expect(draw.insertVertexAtMidpoint).toHaveBeenCalledWith(2)
    expect(announce).toHaveBeenCalledWith('New point inserted', 'action')
    expect(viewportRef.current.focus).toHaveBeenCalled()
  })

  it('does not insert anything for a real vertex — already the live selection — but still announces it and hands focus back', () => {
    const eb = makeEventBus()
    const draw = makeDrawAdapter({ vertices: [[0, 0], [1, 1]], midpoints: [[0.5, 0.5]] })
    const { viewportRef, announce } = setup({ eventBus: eb, draw, mode: 'edit_vertex' })
    act(() => eb.emit(SET_ACTIVE, { id: '0' }))
    act(() => eb.emit(CONFIRM))
    expect(draw.insertVertexAtMidpoint).not.toHaveBeenCalled()
    expect(announce).toHaveBeenCalledWith('Point 1 selected', 'action')
    expect(viewportRef.current.focus).toHaveBeenCalled()
  })

  it('is a no-op — no insert, no announce, no refocus — when nothing is active yet', () => {
    const eb = makeEventBus()
    const draw = makeDrawAdapter({ vertices: [[0, 0]], midpoints: [[0.5, 0.5]] })
    const { viewportRef, announce } = setup({ eventBus: eb, draw, mode: 'edit_vertex' })
    act(() => eb.emit(CONFIRM))
    expect(draw.insertVertexAtMidpoint).not.toHaveBeenCalled()
    expect(announce).not.toHaveBeenCalled()
    expect(viewportRef.current.focus).not.toHaveBeenCalled()
  })

  it('is a no-op when the active id no longer matches any built item (e.g. the geometry changed underneath it)', () => {
    const eb = makeEventBus()
    const draw = makeDrawAdapter({ vertices: [[0, 0], [1, 1]], midpoints: [] })
    const { viewportRef, announce } = setup({ eventBus: eb, draw, mode: 'edit_vertex' })
    act(() => eb.emit(SET_ACTIVE, { id: '99' })) // never a built item
    act(() => eb.emit(CONFIRM))
    expect(draw.insertVertexAtMidpoint).not.toHaveBeenCalled()
    expect(announce).not.toHaveBeenCalled()
    expect(viewportRef.current.focus).not.toHaveBeenCalled()
  })

  it('is a no-op outside edit_vertex, even with a stale active id', () => {
    const eb = makeEventBus()
    const draw = makeDrawAdapter({ vertices: [[0, 0]], midpoints: [[0.5, 0.5]] })
    const { rerender, viewportRef, announce } = setup({ eventBus: eb, draw, mode: 'edit_vertex' })
    act(() => eb.emit(SET_ACTIVE, { id: '1' })) // the midpoint, while still in edit_vertex
    rerender({ mode: 'disabled' })
    act(() => eb.emit(CONFIRM))
    expect(draw.insertVertexAtMidpoint).not.toHaveBeenCalled()
    expect(announce).not.toHaveBeenCalled()
    expect(viewportRef.current.focus).not.toHaveBeenCalled()
  })
})
