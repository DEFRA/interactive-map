import { renderHook, act } from '@testing-library/react'
import { useInteractionHandlers } from './useInteractionHandlers.js'
import * as featureQueries from '../utils/featureQueries.js'
import { isContiguousWithAny } from '../utils/spatial.js'

/* ------------------------------------------------------------------ */
/* Mocks                                                              */
/* ------------------------------------------------------------------ */

jest.mock('../utils/spatial.js', () => ({
  isContiguousWithAny: jest.fn(),
  canSplitFeatures: jest.fn(() => false),
  areAllContiguous: jest.fn(() => false)
}))
jest.mock('../utils/featureQueries.js', () => ({
  getFeaturesAtPoint: jest.fn(),
  findMatchingFeature: jest.fn(),
  buildLayerConfigMap: jest.fn(() => ({}))
}))

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const click = result =>
  act(() =>
    result.current.handleInteraction({
      point: { x: 10, y: 20 },
      coords: [1, 2]
    })
  )

const makeMarkerEl = (rect) => ({
  getBoundingClientRect: () => rect,
  closest: () => ({ getBoundingClientRect: () => ({ left: 0, top: 0 }) }),
  parentElement: {
    getBoundingClientRect: () => ({ left: 0, top: 0 })
  }
})

const setup = (pluginOverrides = {}, markerItems = [], markerRefs = new Map()) => {
  const deps = {
    mapState: {
      markers: { add: jest.fn(), remove: jest.fn(), items: markerItems, markerRefs }
    },
    pluginState: {
      dispatch: jest.fn(),
      layers: [{ layerId: 'parcels', idProperty: 'parcelId' }],
      interactionModes: ['selectMarker', 'selectFeature'],
      multiSelect: false,
      contiguous: false,
      marker: { symbol: 'pin', backgroundColor: 'red' },
      selectedFeatures: [],
      selectedMarkers: [],
      selectionBounds: null,
      ...pluginOverrides
    },
    services: {
      eventBus: { emit: jest.fn() }
    },
    mapProvider: {}
  }

  const utils = renderHook(() => useInteractionHandlers(deps))
  return { ...utils, deps }
}

const baseFeature = {
  properties: { parcelId: 'P1' },
  geometry: { type: 'Polygon' },
  layer: { id: 'parcels' }
}

beforeEach(() => {
  jest.clearAllMocks()

  featureQueries.getFeaturesAtPoint.mockReturnValue([baseFeature])
  featureQueries.findMatchingFeature.mockReturnValue({
    feature: baseFeature,
    config: { layerId: 'parcels', idProperty: 'parcelId' }
  })
})

/* ------------------------------------------------------------------ */
/* DOM marker hit detection                                           */
/* ------------------------------------------------------------------ */

describe('DOM marker hit detection', () => {
  it('dispatches TOGGLE_SELECTED_MARKERS when click is within a marker bounds', () => {
    const markerEl = makeMarkerEl({ left: 5, top: 15, right: 15, bottom: 25 })
    const markerRefs = new Map([['marker-1', markerEl]])
    const markerItems = [{ id: 'marker-1', coords: [1, 2] }]

    const { result, deps } = setup({}, markerItems, markerRefs)
    click(result)

    expect(deps.pluginState.dispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_SELECTED_MARKERS',
      payload: { markerId: 'marker-1', multiSelect: false }
    })
  })

  it('markers take precedence over features when both hit', () => {
    const markerEl = makeMarkerEl({ left: 5, top: 15, right: 15, bottom: 25 })
    const markerRefs = new Map([['marker-1', markerEl]])
    const markerItems = [{ id: 'marker-1', coords: [1, 2] }]

    const { result, deps } = setup({}, markerItems, markerRefs)
    click(result)

    expect(deps.pluginState.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TOGGLE_SELECTED_FEATURES' })
    )
    expect(featureQueries.getFeaturesAtPoint).not.toHaveBeenCalled()
  })

  it('skips markers with no ref and continues to next', () => {
    // marker in items but not in markerRefs — should not throw, should fall through to features
    const markerItems = [{ id: 'marker-no-ref', coords: [1, 2] }]
    const markerRefs = new Map() // no entry for marker-no-ref

    const { result, deps } = setup({}, markerItems, markerRefs)
    click(result)

    expect(featureQueries.getFeaturesAtPoint).toHaveBeenCalled()
    expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TOGGLE_SELECTED_FEATURES' })
    )
  })

  it('uses zero offset when marker element has no features container or parentElement', () => {
    // closest and parentElement both null — fallback parentRect { left: 0, top: 0 } should be used
    const markerEl = {
      getBoundingClientRect: () => ({ left: 5, top: 15, right: 15, bottom: 25 }),
      closest: () => null,
      parentElement: null
    }
    const markerRefs = new Map([['marker-1', markerEl]])
    const markerItems = [{ id: 'marker-1', coords: [1, 2] }]

    const { result, deps } = setup({}, markerItems, markerRefs)
    click(result)

    // click point { x: 10, y: 20 } is within [5,15,15,25] with zero parent offset
    expect(deps.pluginState.dispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_SELECTED_MARKERS',
      payload: { markerId: 'marker-1', multiSelect: false }
    })
  })

  it('falls through to feature selection when click misses all markers', () => {
    // marker bounds don't include the click point { x: 10, y: 20 }
    const markerEl = makeMarkerEl({ left: 50, top: 50, right: 80, bottom: 80 })
    const markerRefs = new Map([['marker-1', markerEl]])
    const markerItems = [{ id: 'marker-1', coords: [1, 2] }]

    const { result, deps } = setup({}, markerItems, markerRefs)
    click(result)

    expect(featureQueries.getFeaturesAtPoint).toHaveBeenCalled()
    expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TOGGLE_SELECTED_FEATURES' })
    )
  })
})

/* ------------------------------------------------------------------ */
/* placeMarker mode                                                   */
/* ------------------------------------------------------------------ */

describe('placeMarker mode', () => {
  it('places marker, clears selection, and emits event', () => {
    const { result, deps } = setup({ interactionModes: ['placeMarker'] })

    click(result)

    expect(deps.pluginState.dispatch).toHaveBeenCalledWith({
      type: 'CLEAR_SELECTED_FEATURES'
    })
    expect(deps.mapState.markers.add).toHaveBeenCalledWith(
      'location',
      [1, 2],
      { symbol: 'pin', backgroundColor: 'red' }
    )
    expect(deps.services.eventBus.emit).toHaveBeenCalledWith(
      'interact:markerchange',
      { coords: [1, 2] }
    )
  })
})

/* ------------------------------------------------------------------ */
/* selectFeature mode                                                 */
/* ------------------------------------------------------------------ */

it('selectFeature mode dispatches selection for matching feature', () => {
  const { result, deps } = setup({ interactionModes: ['selectFeature'] })

  click(result)

  expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'TOGGLE_SELECTED_FEATURES',
      payload: expect.objectContaining({
        featureId: 'P1',
        layerId: 'parcels'
      })
    })
  )
})

it('falls back to placeMarker when selectFeature finds no match', () => {
  featureQueries.getFeaturesAtPoint.mockReturnValue([])
  featureQueries.findMatchingFeature.mockReturnValue(null)

  const { result, deps } = setup({ interactionModes: ['selectFeature', 'placeMarker'] })

  click(result)

  expect(deps.mapState.markers.add).toHaveBeenCalled()
})

/* ------------------------------------------------------------------ */
/* featureId guard (FULL COVERAGE)                                    */
/* ------------------------------------------------------------------ */

it('skips dispatch when idProperty exists but featureId is falsy', () => {
  featureQueries.findMatchingFeature.mockReturnValue({
    feature: {
      properties: { parcelId: undefined },
      geometry: { type: 'Point' },
      layer: { id: 'parcels' }
    },
    config: { layerId: 'parcels', idProperty: 'parcelId' }
  })

  const { result, deps } = setup()

  click(result)

  expect(deps.pluginState.dispatch).not.toHaveBeenCalled()
})

/* ------------------------------------------------------------------ */
/* Multi-select                                                       */
/* ------------------------------------------------------------------ */

it('passes multiSelect flag through to dispatch', () => {
  const { result, deps } = setup({ multiSelect: true })

  click(result)

  expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
    expect.objectContaining({
      payload: expect.objectContaining({ multiSelect: true })
    })
  )
})

/* ------------------------------------------------------------------ */
/* Contiguous selection (FULL COVERAGE)                               */
/* ------------------------------------------------------------------ */

describe('contiguous selection', () => {
  it('does NOT replace selection when feature is contiguous', () => {
    isContiguousWithAny.mockReturnValue(true) // contiguous

    const { result, deps } = setup({
      contiguous: true,
      selectedFeatures: [{ geometry: { type: 'Polygon' } }]
    })

    click(result)

    expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          replaceAll: false
        })
      })
    )
  })

  it('replaces selection when feature is NOT contiguous', () => {
    isContiguousWithAny.mockReturnValue(false) // disjoint

    const { result, deps } = setup({
      contiguous: true,
      selectedFeatures: [{ geometry: { type: 'Polygon' } }]
    })

    click(result)

    expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          replaceAll: true
        })
      })
    )
  })

  it('does not compute contiguity when contiguous is false', () => {
    const { result } = setup({ contiguous: false })

    click(result)

    expect(isContiguousWithAny).not.toHaveBeenCalled()
  })
})

/* ------------------------------------------------------------------ */
/* deselectOnClickOutside                                             */
/* ------------------------------------------------------------------ */

describe('deselectOnClickOutside', () => {
  beforeEach(() => {
    featureQueries.getFeaturesAtPoint.mockReturnValue([])
    featureQueries.findMatchingFeature.mockReturnValue(null)
  })

  it('clears selection when clicking outside a feature in select mode', () => {
    const { result, deps } = setup({ deselectOnClickOutside: true })

    click(result)

    expect(deps.pluginState.dispatch).toHaveBeenCalledWith({ type: 'CLEAR_SELECTED_FEATURES' })
    expect(deps.mapState.markers.add).not.toHaveBeenCalled()
  })

  it('does not clear selection when deselectOnClickOutside is false', () => {
    const { result, deps } = setup({ deselectOnClickOutside: false })

    click(result)

    expect(deps.pluginState.dispatch).not.toHaveBeenCalled()
  })
})

/* ------------------------------------------------------------------ */
/* placeMarker / selectFeature guards                                 */
/* ------------------------------------------------------------------ */

it('places marker with placeMarker mode even when no layers exist', () => {
  featureQueries.getFeaturesAtPoint.mockReturnValue([])
  featureQueries.findMatchingFeature.mockReturnValue(null)

  const { result, deps } = setup({
    interactionModes: ['selectFeature', 'placeMarker'],
    layers: []
  })

  click(result)

  expect(deps.mapState.markers.add).toHaveBeenCalled()
})

it('does not place marker when placeMarker is not in interactionModes', () => {
  featureQueries.getFeaturesAtPoint.mockReturnValue([])
  featureQueries.findMatchingFeature.mockReturnValue(null)

  const { result, deps } = setup({ interactionModes: ['selectFeature'] })

  click(result)

  expect(deps.mapState.markers.add).not.toHaveBeenCalled()
})

it('does not check markers when selectMarker is not in interactionModes', () => {
  const markerEl = makeMarkerEl({ left: 5, top: 15, right: 15, bottom: 25 })
  const markerRefs = new Map([['marker-1', markerEl]])
  const markerItems = [{ id: 'marker-1', coords: [1, 2] }]

  const { result, deps } = setup({ interactionModes: ['selectFeature'] }, markerItems, markerRefs)
  click(result)

  expect(deps.pluginState.dispatch).not.toHaveBeenCalledWith(
    expect.objectContaining({ type: 'TOGGLE_SELECTED_MARKERS' })
  )
  expect(featureQueries.getFeaturesAtPoint).toHaveBeenCalled()
})

/* ------------------------------------------------------------------ */
/* Selection change event                                             */
/* ------------------------------------------------------------------ */

it('emits selectionchange once when bounds exist', () => {
  const deps = {
    mapState: { markers: { add: jest.fn(), remove: jest.fn(), items: [], markerRefs: new Map() } },
    pluginState: {
      selectedFeatures: [{ featureId: 'F1' }],
      selectedMarkers: [],
      selectionBounds: { sw: [0, 0], ne: [1, 1] }
    },
    services: { eventBus: { emit: jest.fn() } },
    mapProvider: {}
  }

  renderHook(() => useInteractionHandlers(deps))

  expect(deps.services.eventBus.emit).toHaveBeenCalledWith(
    'interact:selectionchange',
    expect.objectContaining({
      selectedFeatures: deps.pluginState.selectedFeatures,
      selectedMarkers: [],
      selectionBounds: deps.pluginState.selectionBounds,
      canMerge: false,
      canSplit: false
    })
  )
})

it('skips emission when selection remains empty after being cleared', () => {
  const eventBus = { emit: jest.fn() }

  // 1. First render with a feature (prev is null, emission happens)
  const { rerender } = renderHook(
    ({ features }) => useInteractionHandlers({
      mapState: { markers: { items: [], markerRefs: new Map() } },
      pluginState: { selectedFeatures: features, selectedMarkers: [], selectionBounds: { b: 1 } },
      services: { eventBus },
      mapProvider: {}
    }),
    { initialProps: { features: [{ id: 'f1' }] } }
  )

  expect(eventBus.emit).toHaveBeenCalledTimes(1)
  eventBus.emit.mockClear()

  // 2. Rerender with empty selection (prev is now [{id: 'f1'}], emission happens)
  rerender({ features: [] })
  expect(eventBus.emit).toHaveBeenCalledTimes(1)
  eventBus.emit.mockClear()

  // 3. Rerender with empty selection AGAIN
  // This triggers: prev !== null AND prev.length === 0
  rerender({ features: [] })

  // Should skip emission because wasEmpty is true (via prev.length === 0)
  // and current features.length is 0
  expect(eventBus.emit).not.toHaveBeenCalled()
})

/* ------------------------------------------------------------------ */
/* Debug mode                                                         */
/* ------------------------------------------------------------------ */

it('logs features when debug mode is enabled', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

  const { result } = setup({ debug: true })

  click(result)

  expect(logSpy).toHaveBeenCalledWith(
    expect.stringContaining('--- Features at'),
    expect.any(Array)
  )

  logSpy.mockRestore()
})
