import { renderHook, act } from '@testing-library/react'
import { useInteractionHandlers } from './useInteractionHandlers.js'
import * as featureQueries from '../utils/featureQueries.js'
import booleanDisjoint from '@turf/boolean-disjoint'

/* ------------------------------------------------------------------ */
/* Mocks                                                              */
/* ------------------------------------------------------------------ */

jest.mock('@turf/boolean-disjoint', () => jest.fn())
jest.mock('../utils/turfHelpers.js', () => ({
  toTurfGeometry: jest.fn(g => g)
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

const setup = (pluginOverrides = {}) => {
  const deps = {
    mapState: {
      markers: { add: jest.fn(), remove: jest.fn() }
    },
    pluginState: {
      dispatch: jest.fn(),
      dataLayers: [{ layerId: 'parcels', idProperty: 'parcelId' }],
      interactionMode: 'select',
      multiSelect: false,
      contiguous: false,
      markerColor: 'red',
      selectedFeatures: [],
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
/* Marker mode                                                        */
/* ------------------------------------------------------------------ */

describe('marker mode', () => {
  it('places marker, clears selection, and emits event', () => {
    const { result, deps } = setup({ interactionMode: 'marker' })

    click(result)

    expect(deps.pluginState.dispatch).toHaveBeenCalledWith({
      type: 'CLEAR_SELECTED_FEATURES'
    })
    expect(deps.mapState.markers.add).toHaveBeenCalledWith(
      'location',
      [1, 2],
      { color: 'red' }
    )
    expect(deps.services.eventBus.emit).toHaveBeenCalledWith(
      'interact:markerchange',
      { coords: [1, 2] }
    )
  })
})

/* ------------------------------------------------------------------ */
/* Select & Auto modes                                                */
/* ------------------------------------------------------------------ */

describe.each(['select', 'auto'])('%s mode feature selection', mode => {
  it('dispatches selection for matching feature', () => {
    const { result, deps } = setup({ interactionMode: mode })

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
})

it('falls back to marker in auto mode when no feature found', () => {
  featureQueries.getFeaturesAtPoint.mockReturnValue([])
  featureQueries.findMatchingFeature.mockReturnValue(null)

  const { result, deps } = setup({ interactionMode: 'auto' })

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
    booleanDisjoint.mockReturnValue(false) // overlapping

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
    booleanDisjoint.mockReturnValue(true) // disjoint

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

    expect(booleanDisjoint).not.toHaveBeenCalled()
  })
})

/* ------------------------------------------------------------------ */
/* Marker condition guard (FULL COVERAGE)                             */
/* ------------------------------------------------------------------ */

it('does NOT place marker in auto mode when no dataLayers exist', () => {
  featureQueries.getFeaturesAtPoint.mockReturnValue([])
  featureQueries.findMatchingFeature.mockReturnValue(null)

  const { result, deps } = setup({
    interactionMode: 'auto',
    dataLayers: []
  })

  click(result)

  expect(deps.mapState.markers.add).not.toHaveBeenCalled()
})

/* ------------------------------------------------------------------ */
/* Selection change event                                             */
/* ------------------------------------------------------------------ */

it('emits selectionchange once when bounds exist', () => {
  const deps = {
    mapState: { markers: { add: jest.fn(), remove: jest.fn() } },
    pluginState: {
      selectedFeatures: [{ featureId: 'F1' }],
      selectionBounds: { sw: [0, 0], ne: [1, 1] }
    },
    services: { eventBus: { emit: jest.fn() } },
    mapProvider: {}
  }

  renderHook(() => useInteractionHandlers(deps))

  expect(deps.services.eventBus.emit).toHaveBeenCalledWith(
    'interact:selectionchange',
    deps.pluginState
  )
})
