import { renderHook, act } from '@testing-library/react'
import { useHighlightSync } from './useHighlightSync.js'
import { buildStylesMap } from '../utils/buildStylesMap.js'

jest.mock('../utils/buildStylesMap.js', () => ({
  buildStylesMap: jest.fn(() => ({ layer1: { stroke: 'red', fill: 'blue' } }))
}))

const STYLE_CHANGE = 'map:stylechange'
const SET_SIZE = 'map:setsize'
const DATA_CHANGE = 'map:datachange'

// A minimal real-ish event bus (mirrors src/services/eventBus.js's on/once/off contract)
// rather than jest.fn() stubs — the re-arming logic under test depends on once() genuinely
// self-removing and on() genuinely supporting multiple independent listeners, which a bare
// mock can't exercise faithfully.
const createEventBus = () => {
  const listeners = {}
  return {
    on: jest.fn((event, handler) => { (listeners[event] ??= []).push(handler) }),
    once: jest.fn((event, handler) => {
      const wrapper = (...args) => { bus.off(event, wrapper); handler(...args) }
      listeners[event] ??= []
      listeners[event].push(wrapper)
    }),
    off: jest.fn((event, handler) => { listeners[event] = (listeners[event] ?? []).filter(h => h !== handler) }),
    emit: (event, ...args) => { (listeners[event] ?? []).slice().forEach(h => h(...args)) },
    _listenerCount: (event) => (listeners[event] ?? []).length
  }
}
let bus

let mockDeps

const render = (overrides = {}) =>
  renderHook(() => useHighlightSync({ ...mockDeps, ...overrides }))

beforeEach(() => {
  jest.clearAllMocks()
  bus = createEventBus()

  mockDeps = {
    mapProvider: {
      updateHighlightedFeatures: jest.fn(() => ({ sw: [0, 0], ne: [1, 1] }))
    },
    mapStyle: { id: 'default-style' },
    pluginState: {
      layers: [{ layerId: 'layer1' }]
    },
    selectedFeatures: [],
    events: { MAP_STYLE_CHANGE: STYLE_CHANGE, MAP_SET_SIZE: SET_SIZE, MAP_DATA_CHANGE: DATA_CHANGE },
    eventBus: bus
  }
})

// ─── useHighlightSync — highlighting ─────────────────────────────────────────

describe('useHighlightSync — highlighting', () => {
  it('updates map highlights', () => {
    mockDeps.selectedFeatures = [{ featureId: 'F1', layerId: 'layer1' }]

    render()

    expect(mockDeps.mapProvider.updateHighlightedFeatures).toHaveBeenCalledWith(
      mockDeps.selectedFeatures,
      [],
      expect.any(Object)
    )
  })
})

// ─── useHighlightSync — styles memoization ───────────────────────────────────

describe('useHighlightSync — styles memoization', () => {
  it('rebuilds styles when mapStyle changes', () => {
    mockDeps.selectedFeatures = [{ featureId: 'F1' }]

    const { rerender } = renderHook(
      ({ mapStyle }) => useHighlightSync({ ...mockDeps, mapStyle }),
      { initialProps: { mapStyle: { id: 'light' } } }
    )

    buildStylesMap.mockClear()
    rerender({ mapStyle: { id: 'satellite' } })

    expect(buildStylesMap).toHaveBeenCalledWith(expect.anything(), { id: 'satellite' })
  })

  it('rebuilds styles when layers change', () => {
    mockDeps.selectedFeatures = [{ featureId: 'F1' }]

    const { rerender } = renderHook(
      ({ layers }) => useHighlightSync({ ...mockDeps, pluginState: { layers } }),
      { initialProps: { layers: [{ layerId: 'layer1' }] } }
    )

    buildStylesMap.mockClear()
    rerender({ layers: [{ layerId: 'layer1' }, { layerId: 'layer2' }] })

    expect(buildStylesMap).toHaveBeenCalled()
  })
})

// ─── useHighlightSync — style/size-change settle window ──────────────────────

describe('useHighlightSync — style/size-change settle window', () => {
  it('refreshes highlights after MAP_STYLE_CHANGE then MAP_DATA_CHANGE', () => {
    mockDeps.selectedFeatures = [{ featureId: 'F1', layerId: 'layer1' }]

    render()
    mockDeps.mapProvider.updateHighlightedFeatures.mockClear()

    act(() => bus.emit(STYLE_CHANGE))
    act(() => bus.emit(DATA_CHANGE))

    expect(mockDeps.mapProvider.updateHighlightedFeatures).toHaveBeenCalledTimes(1)
  })

  it('also refreshes after MAP_SET_SIZE then MAP_DATA_CHANGE', () => {
    mockDeps.selectedFeatures = [{ featureId: 'F1', layerId: 'layer1' }]

    render()
    mockDeps.mapProvider.updateHighlightedFeatures.mockClear()

    act(() => bus.emit(SET_SIZE))
    act(() => bus.emit(DATA_CHANGE))

    expect(mockDeps.mapProvider.updateHighlightedFeatures).toHaveBeenCalledTimes(1)
  })

  // The whole reason for re-arming rather than a single listen-once: MAP_DATA_CHANGE
  // typically fires more than once during a settle (basemap loading before a drawn
  // feature's own symbol re-resolution has finished) — the second, later firing must
  // still be caught, not missed because the first already consumed a one-shot listener.
  it('keeps re-applying on every MAP_DATA_CHANGE within the settle window, not just the first', () => {
    mockDeps.selectedFeatures = [{ featureId: 'F1', layerId: 'layer1' }]

    render()
    mockDeps.mapProvider.updateHighlightedFeatures.mockClear()

    act(() => bus.emit(STYLE_CHANGE))
    act(() => bus.emit(DATA_CHANGE)) // early, still-stale settle
    act(() => bus.emit(DATA_CHANGE)) // later, real settle
    act(() => bus.emit(DATA_CHANGE))

    expect(mockDeps.mapProvider.updateHighlightedFeatures).toHaveBeenCalledTimes(3)
  })

  it('stops re-arming once the settle window has elapsed, so it does not listen forever', () => {
    jest.useFakeTimers()
    mockDeps.selectedFeatures = [{ featureId: 'F1', layerId: 'layer1' }]

    render()
    mockDeps.mapProvider.updateHighlightedFeatures.mockClear()

    act(() => bus.emit(STYLE_CHANGE))
    act(() => bus.emit(DATA_CHANGE)) // re-arms — within the window
    expect(bus._listenerCount(DATA_CHANGE)).toBe(1)

    jest.advanceTimersByTime(4000) // past the settle window
    act(() => bus.emit(DATA_CHANGE)) // the last re-arm still fires once...
    expect(bus._listenerCount(DATA_CHANGE)).toBe(0) // ...but does not re-arm again

    jest.useRealTimers()
  })

  it('a second style/size change while still settling extends the window without double-registering', () => {
    jest.useFakeTimers()
    mockDeps.selectedFeatures = [{ featureId: 'F1', layerId: 'layer1' }]

    render()

    act(() => bus.emit(STYLE_CHANGE))
    expect(bus._listenerCount(DATA_CHANGE)).toBe(1)
    act(() => bus.emit(SET_SIZE)) // still armed — must not add a second listener
    expect(bus._listenerCount(DATA_CHANGE)).toBe(1)

    jest.useRealTimers()
  })

  it('unsubscribes MAP_STYLE_CHANGE/MAP_SET_SIZE/MAP_DATA_CHANGE listeners on unmount', () => {
    mockDeps.selectedFeatures = [{ featureId: 'F1', layerId: 'layer1' }]

    const { unmount } = render()
    act(() => bus.emit(STYLE_CHANGE)) // arm the MAP_DATA_CHANGE re-apply listener too
    unmount()

    expect(bus._listenerCount(STYLE_CHANGE)).toBe(0)
    expect(bus._listenerCount(SET_SIZE)).toBe(0)
    expect(bus._listenerCount(DATA_CHANGE)).toBe(0)
  })
})

// ─── useHighlightSync — guards ───────────────────────────────────────────────

describe('useHighlightSync — guards', () => {
  it('does nothing when mapProvider is null', () => {
    mockDeps.mapProvider = null
    mockDeps.selectedFeatures = [{ featureId: 'F1' }]

    expect(() => render()).not.toThrow()
  })

  it('does nothing when mapStyle is null', () => {
    mockDeps.mapStyle = null
    mockDeps.selectedFeatures = [{ featureId: 'F1' }]

    render()

    expect(mockDeps.mapProvider.updateHighlightedFeatures).not.toHaveBeenCalled()
    expect(buildStylesMap).not.toHaveBeenCalled()
  })
})

// ─── useHighlightSync — selection updates ────────────────────────────────────

describe('useHighlightSync — selection updates', () => {
  it('updates highlights when selection changes', () => {
    const { rerender } = renderHook(
      ({ selectedFeatures }) => useHighlightSync({ ...mockDeps, selectedFeatures }),
      { initialProps: { selectedFeatures: [{ featureId: 'F1' }] } }
    )

    mockDeps.mapProvider.updateHighlightedFeatures.mockClear()
    rerender({ selectedFeatures: [{ featureId: 'F1' }, { featureId: 'F2' }] })

    expect(mockDeps.mapProvider.updateHighlightedFeatures).toHaveBeenCalledWith(
      [{ featureId: 'F1' }, { featureId: 'F2' }],
      [],
      expect.anything()
    )
  })

  it('clears highlights when selection becomes empty', () => {
    const { rerender } = renderHook(
      ({ selectedFeatures }) => useHighlightSync({ ...mockDeps, selectedFeatures }),
      { initialProps: { selectedFeatures: [{ featureId: 'F1' }] } }
    )

    mockDeps.mapProvider.updateHighlightedFeatures.mockClear()
    rerender({ selectedFeatures: [] })

    expect(mockDeps.mapProvider.updateHighlightedFeatures).toHaveBeenCalledWith(
      [],
      [],
      expect.anything()
    )
  })
})

// ─── useHighlightSync — listboxActiveItem ────────────────────────────────────

describe('useHighlightSync — listboxActiveItem', () => {
  it('passes listboxActiveItem as activeFeatures (second arg)', () => {
    mockDeps.pluginState = {
      layers: [{ layerId: 'layer1' }],
      listboxActiveItem: { featureId: 'A1', layerId: 'layer1', idProperty: 'id', geometry: { type: 'Point' } }
    }
    mockDeps.selectedFeatures = []

    render()

    expect(mockDeps.mapProvider.updateHighlightedFeatures).toHaveBeenCalledWith(
      [],
      [{ featureId: 'A1', layerId: 'layer1', idProperty: 'id', geometry: { type: 'Point' } }],
      expect.anything()
    )
  })

  it('passes selectedFeatures and listboxActiveItem as separate arguments', () => {
    mockDeps.pluginState = {
      layers: [{ layerId: 'layer1' }],
      listboxActiveItem: { featureId: 'A1', layerId: 'layer1', idProperty: 'id', geometry: { type: 'Point' } }
    }
    mockDeps.selectedFeatures = [{ featureId: 'F1', layerId: 'layer1' }]

    render()

    expect(mockDeps.mapProvider.updateHighlightedFeatures).toHaveBeenCalledWith(
      [{ featureId: 'F1', layerId: 'layer1' }],
      [{ featureId: 'A1', layerId: 'layer1', idProperty: 'id', geometry: { type: 'Point' } }],
      expect.anything()
    )
  })

  it('re-highlights when listboxActiveItem changes', () => {
    const { rerender } = renderHook(
      ({ pluginState }) => useHighlightSync({ ...mockDeps, pluginState }),
      {
        initialProps: {
          pluginState: { layers: [{ layerId: 'layer1' }], listboxActiveItem: null }
        }
      }
    )

    mockDeps.mapProvider.updateHighlightedFeatures.mockClear()

    rerender({
      pluginState: {
        layers: [{ layerId: 'layer1' }],
        listboxActiveItem: { featureId: 'A1', layerId: 'layer1', idProperty: 'id', geometry: { type: 'Point' } }
      }
    })

    expect(mockDeps.mapProvider.updateHighlightedFeatures).toHaveBeenCalledWith(
      [],
      [{ featureId: 'A1', layerId: 'layer1', idProperty: 'id', geometry: { type: 'Point' } }],
      expect.anything()
    )
  })
})
