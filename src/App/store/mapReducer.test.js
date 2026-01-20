import { initialState, reducer } from './mapReducer.js'
import { actionsMap } from './mapActionsMap.js'
import { createMockRegistries } from '../../test-utils.js'

jest.mock('./mapActionsMap.js', () => ({
  actionsMap: {
    TEST_ACTION: jest.fn((state, payload) => ({ ...state, testValue: payload }))
  }
}))

describe('mapReducer', () => {
  let mockPluginRegistry

  beforeEach(() => {
    jest.clearAllMocks()
    const registries = createMockRegistries()
    mockPluginRegistry = registries.pluginRegistry
  })

  describe('initialState', () => {
    const baseConfig = {
      center: [0, 0],
      zoom: 5,
      bounds: [1, 2, 3, 4],
      mapStyle: { id: 'style1' },
      mapSize: '100x100',
      markers: [{ id: 1, name: 'Marker1' }]
    }

    const getConfig = (overrides = {}) => ({
      ...baseConfig,
      pluginRegistry: mockPluginRegistry,
      ...overrides
    })

    test('returns default state using mapStyle when no plugin handles map styles', () => {
      const state = initialState(getConfig())

      expect(state).toMatchObject({
        isMapReady: false,
        mapStyle: { id: 'style1' },
        mapSize: '100x100',
        center: [0, 0],
        zoom: 5,
        bounds: [1, 2, 3, 4],
        resolution: null,
        isAtMaxZoom: null,
        isAtMinZoom: null,
        crossHair: {
          isVisible: false,
          isPinnedToMap: false,
          state: 'active'
        },
        markers: {
          items: [{ id: 1, name: 'Marker1' }]
        }
      })
    })

    test('sets mapStyle to null when a plugin handles map styles', () => {
      mockPluginRegistry.registeredPlugins.push({ config: { handlesMapStyle: true } })

      const state = initialState(getConfig({ mapStyle: { id: 'custom' }, center: [10, 20], zoom: 12 }))

      expect(state.mapStyle).toBeNull()
      expect(state.center).toEqual([10, 20])
      expect(state.zoom).toBe(12)
    })

    test('defaults markers.items to empty array when no markers are provided', () => {
      const state = initialState(getConfig({ markers: undefined }))

      expect(state.markers.items).toEqual([])
    })

    test('uses extent when bounds is not provided', () => {
      const state = initialState(getConfig({
        bounds: undefined,
        extent: [5, 6, 7, 8]
      }))

      expect(state.bounds).toEqual([5, 6, 7, 8])
    })

    test('prefers bounds over extent when both are provided', () => {
      const state = initialState(getConfig({
        bounds: [1, 2, 3, 4],
        extent: [5, 6, 7, 8]
      }))

      expect(state.bounds).toEqual([1, 2, 3, 4])
    })
  })

  describe('reducer', () => {
    const baseState = { foo: 'bar' }

    test('calls mapped action when type exists in actionsMap', () => {
      const action = { type: 'TEST_ACTION', payload: 'newValue' }
      const result = reducer(baseState, action)

      expect(actionsMap.TEST_ACTION).toHaveBeenCalledWith(baseState, 'newValue')
      expect(result).toEqual({ foo: 'bar', testValue: 'newValue' })
    })

    test('returns original state when action type is unknown', () => {
      const action = { type: 'UNKNOWN_ACTION', payload: 'irrelevant' }
      const result = reducer(baseState, action)

      expect(result).toBe(baseState)
    })
  })
})
