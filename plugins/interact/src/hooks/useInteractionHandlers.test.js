import { renderHook, act } from '@testing-library/react'
import { useInteractionHandlers } from './useInteractionHandlers.js'
import * as featureQueries from '../utils/featureQueries.js'
import * as spatial from '../utils/spatial.js'
/* ------------------------------------------------------------------ */
/* Mocks                                                              */
/* ------------------------------------------------------------------ */

jest.mock('../utils/spatial.js', () => ({
  areAllContiguous: jest.fn(() => false),
  isContiguousWithAny: jest.fn(() => true)
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
      marker: { symbol: 'pin', backgroundColor: 'red' },
      selectedFeatures: [],
      selectedMarkers: [],
      selectionBounds: null,
      ...pluginOverrides
    },
    services: {
      eventBus: { emit: jest.fn() }
    },
    mapProvider: { getFeatureGeometry: jest.fn(() => null) }
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
  spatial.isContiguousWithAny.mockReturnValue(true)
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

it('does not emit selectionchange when features are selected but bounds not yet calculated', () => {
  const deps = {
    mapState: { markers: { add: jest.fn(), remove: jest.fn(), items: [], markerRefs: new Map() } },
    pluginState: {
      selectedFeatures: [{ featureId: 'F1' }],
      selectedMarkers: [],
      selectionBounds: null
    },
    services: { eventBus: { emit: jest.fn() } },
    mapProvider: { getFeatureGeometry: jest.fn(() => null) }
  }

  renderHook(() => useInteractionHandlers(deps))

  expect(deps.services.eventBus.emit).not.toHaveBeenCalled()
})

it('emits selectionchange once when bounds exist', () => {
  const deps = {
    mapState: { markers: { add: jest.fn(), remove: jest.fn(), items: [], markerRefs: new Map() } },
    pluginState: {
      selectedFeatures: [{ featureId: 'F1' }],
      selectedMarkers: [],
      selectionBounds: { sw: [0, 0], ne: [1, 1] }
    },
    services: { eventBus: { emit: jest.fn() } },
    mapProvider: { getFeatureGeometry: jest.fn(() => null) }
  }

  renderHook(() => useInteractionHandlers(deps))

  expect(deps.services.eventBus.emit).toHaveBeenCalledWith(
    'interact:selectionchange',
    expect.objectContaining({
      selectedFeatures: deps.pluginState.selectedFeatures,
      selectedMarkers: [],
      selectionBounds: deps.pluginState.selectionBounds,
      contiguous: false
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
      mapProvider: { getFeatureGeometry: jest.fn(() => null) }
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

/* ------------------------------------------------------------------ */
/* contiguous enforcement                                             */
/* ------------------------------------------------------------------ */

describe('contiguous enforcement', () => {
  const existingFeature = {
    featureId: 'P0',
    layerId: 'parcels',
    geometry: { type: 'Polygon', coordinates: [] }
  }

  it('allows first selection when no features already selected', () => {
    spatial.isContiguousWithAny.mockReturnValue(false)
    const { result, deps } = setup({ contiguous: true, multiSelect: true, selectedFeatures: [] })

    click(result)

    expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TOGGLE_SELECTED_FEATURES' })
    )
  })

  it('allows adding a contiguous feature', () => {
    spatial.isContiguousWithAny.mockReturnValue(true)
    const { result, deps } = setup({
      contiguous: true,
      multiSelect: true,
      selectedFeatures: [existingFeature]
    })

    click(result)

    expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TOGGLE_SELECTED_FEATURES' })
    )
  })

  it('replaces selection when clicking a non-contiguous feature', () => {
    spatial.isContiguousWithAny.mockReturnValue(false)
    const { result, deps } = setup({
      contiguous: true,
      multiSelect: true,
      selectedFeatures: [existingFeature]
    })

    click(result)

    expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TOGGLE_SELECTED_FEATURES',
        payload: expect.objectContaining({ replaceAll: true })
      })
    )
  })

  it('allows deselecting an already-selected feature regardless of contiguity', () => {
    spatial.isContiguousWithAny.mockReturnValue(false)
    const alreadySelected = { featureId: 'P1', layerId: 'parcels', geometry: { type: 'Polygon', coordinates: [] } }
    const { result, deps } = setup({
      contiguous: true,
      multiSelect: true,
      selectedFeatures: [alreadySelected]
    })

    click(result)

    expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TOGGLE_SELECTED_FEATURES' })
    )
  })

  it('does not enforce contiguous when contiguous is false', () => {
    spatial.isContiguousWithAny.mockReturnValue(false)
    const { result, deps } = setup({
      contiguous: false,
      multiSelect: true,
      selectedFeatures: [existingFeature]
    })

    click(result)

    expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TOGGLE_SELECTED_FEATURES' })
    )
  })

  it('does not enforce contiguous in single-select mode', () => {
    spatial.isContiguousWithAny.mockReturnValue(false)
    const { result, deps } = setup({
      contiguous: true,
      multiSelect: false,
      selectedFeatures: [existingFeature]
    })

    click(result)

    expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TOGGLE_SELECTED_FEATURES' })
    )
  })

  it('falls through to normal toggle when selected features have no usable geometry', () => {
    const noGeomFeature = { featureId: 'P0', layerId: 'parcels' }
    const { result, deps } = setup({
      contiguous: true,
      multiSelect: true,
      selectedFeatures: [noGeomFeature]
    })

    click(result)

    expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TOGGLE_SELECTED_FEATURES',
        payload: expect.not.objectContaining({ replaceAll: true })
      })
    )
  })

  it('uses the geometry returned by the provider as the dispatched geometry', () => {
    const enriched = { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]] }
    const { result, deps } = setup({ contiguous: false, multiSelect: true, selectedFeatures: [] })
    deps.mapProvider.getFeatureGeometry.mockReturnValue(enriched)

    click(result)

    expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ geometry: enriched })
      })
    )
  })

  it('uses stored geometry when provider returns null', () => {
    const { result, deps } = setup({ contiguous: false, multiSelect: true, selectedFeatures: [] })
    deps.mapProvider.getFeatureGeometry.mockReturnValue(null)

    click(result)

    expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ geometry: baseFeature.geometry })
      })
    )
  })

  it('uses stored geometry when provider has no getFeatureGeometry', () => {
    const { result, deps } = setup({ contiguous: false, multiSelect: true, selectedFeatures: [] })
    deps.mapProvider.getFeatureGeometry = undefined

    click(result)

    expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ geometry: baseFeature.geometry })
      })
    )
  })

  it('falls through to normal toggle when clicked feature has no geometry', () => {
    featureQueries.findMatchingFeature.mockReturnValue({
      feature: { properties: { parcelId: 'P1' }, geometry: null, layer: { id: 'parcels' } },
      config: { layerId: 'parcels', idProperty: 'parcelId' }
    })
    const { result, deps } = setup({
      contiguous: true,
      multiSelect: true,
      selectedFeatures: [existingFeature]
    })

    click(result)

    expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TOGGLE_SELECTED_FEATURES' })
    )
  })

  describe('deselect splits selection', () => {
    const featureA = { featureId: 'P0', layerId: 'parcels', geometry: { type: 'Polygon', coordinates: [] } }
    const featureB = { featureId: 'P1', layerId: 'parcels', geometry: { type: 'Polygon', coordinates: [] } }
    const featureC = { featureId: 'P2', layerId: 'parcels', geometry: { type: 'Polygon', coordinates: [] } }

    it('trims to first contiguous group when deselecting the bridge feature', () => {
      // A-B-C selected; deselect B (baseFeature returns P1); A and C are not contiguous
      spatial.isContiguousWithAny.mockReturnValue(false)
      const { result, deps } = setup({
        contiguous: true,
        multiSelect: true,
        selectedFeatures: [featureA, featureB, featureC]
      })

      click(result) // clicks P1 = featureB

      expect(deps.pluginState.dispatch).toHaveBeenCalledWith({
        type: 'SET_SELECTED_FEATURES',
        payload: [featureA]
      })
    })

    it('uses normal toggle when deselecting an end feature leaves a contiguous set', () => {
      // A-B-C selected; deselect C (override mock to return P2); A and B are still contiguous
      featureQueries.findMatchingFeature.mockReturnValue({
        feature: { properties: { parcelId: 'P2' }, geometry: { type: 'Polygon' }, layer: { id: 'parcels' } },
        config: { layerId: 'parcels', idProperty: 'parcelId' }
      })
      // isContiguousWithAny defaults to true — A and B are contiguous
      const { result, deps } = setup({
        contiguous: true,
        multiSelect: true,
        selectedFeatures: [featureA, featureB, featureC]
      })

      click(result) // clicks P2 = featureC

      expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'TOGGLE_SELECTED_FEATURES' })
      )
      expect(deps.pluginState.dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SET_SELECTED_FEATURES' })
      )
    })

    it('does not check for split when fewer than 3 features selected', () => {
      spatial.isContiguousWithAny.mockReturnValue(false)
      const { result, deps } = setup({
        contiguous: true,
        multiSelect: true,
        selectedFeatures: [featureA, featureB] // only 2 — deselect goes straight to normal toggle
      })

      click(result) // clicks P1 = featureB

      expect(deps.pluginState.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'TOGGLE_SELECTED_FEATURES' })
      )
      expect(deps.pluginState.dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SET_SELECTED_FEATURES' })
      )
    })
  })
})
