import { renderHook, act } from '@testing-library/react'
import { useHighlightSync } from './useHighlightSync.js'
import { buildStylesMap } from '../utils/buildStylesMap.js'

jest.mock('../utils/buildStylesMap.js', () => ({
  buildStylesMap: jest.fn(() => ({ layer1: { stroke: 'red', fill: 'blue' } }))
}))

const STYLE_CHANGE = 'map:stylechange'
const DATA_CHANGE = 'map:datachange'

let mockDeps
let capturedStyleChangeHandler
let capturedDataChangeHandler

const render = (overrides = {}) =>
  renderHook(() => useHighlightSync({ ...mockDeps, ...overrides }))

beforeEach(() => {
  jest.clearAllMocks()
  capturedStyleChangeHandler = null
  capturedDataChangeHandler = null

  mockDeps = {
    mapProvider: {
      updateHighlightedFeatures: jest.fn(() => ({ sw: [0, 0], ne: [1, 1] }))
    },
    mapStyle: { id: 'default-style' },
    pluginState: {
      layers: [{ layerId: 'layer1' }]
    },
    selectedFeatures: [],
    events: { MAP_STYLE_CHANGE: STYLE_CHANGE, MAP_DATA_CHANGE: DATA_CHANGE },
    eventBus: {
      on: jest.fn((event, handler) => {
        if (event === STYLE_CHANGE) {
          capturedStyleChangeHandler = handler
        }
      }),
      once: jest.fn((event, handler) => {
        if (event === DATA_CHANGE) {
          capturedDataChangeHandler = handler
        }
      }),
      off: jest.fn()
    }
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

// ─── useHighlightSync — style-change event ───────────────────────────────────

describe('useHighlightSync — style-change event', () => {
  it('refreshes highlights after MAP_STYLE_CHANGE then MAP_DATA_CHANGE', () => {
    mockDeps.selectedFeatures = [{ featureId: 'F1', layerId: 'layer1' }]

    render()
    mockDeps.mapProvider.updateHighlightedFeatures.mockClear()

    act(() => capturedStyleChangeHandler())
    act(() => capturedDataChangeHandler())

    expect(mockDeps.mapProvider.updateHighlightedFeatures).toHaveBeenCalled()
  })

  it('unsubscribes on unmount', () => {
    mockDeps.selectedFeatures = [{ featureId: 'F1', layerId: 'layer1' }]

    const { unmount } = render()
    unmount()

    expect(mockDeps.eventBus.off).toHaveBeenCalledWith(STYLE_CHANGE, expect.any(Function))
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
