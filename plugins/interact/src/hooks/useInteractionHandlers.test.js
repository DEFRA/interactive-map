import { renderHook, act } from '@testing-library/react'
import { useInteractionHandlers } from './useInteractionHandlers.js'
import * as featureQueries from '../utils/featureQueries.js'

jest.mock('../utils/featureQueries.js', () => ({
  getFeaturesAtPoint: jest.fn(() => []),
  findMatchingFeature: jest.fn(() => null),
  buildLayerConfigMap: jest.fn(() => ({}))
}))

describe('useInteractionHandlers', () => {
  let mockDeps

  beforeEach(() => {
    jest.clearAllMocks()

    mockDeps = {
      mapState: {
        markers: {
          add: jest.fn(),
          remove: jest.fn()
        }
      },
      pluginState: {
        dispatch: jest.fn(),
        dataLayers: [],
        interactionMode: 'marker',
        multiSelect: false,
        markerColor: 'red',
        selectedFeatures: [],
        selectionBounds: null
      },
      services: {
        eventBus: {
          emit: jest.fn(),
          on: jest.fn(),
          off: jest.fn()
        }
      },
      mapProvider: {}
    }
  })

  describe('handleInteraction in marker mode', () => {
    it('places marker at clicked location', () => {
      mockDeps.pluginState.interactionMode = 'marker'

      const { result } = renderHook(() => useInteractionHandlers(mockDeps))

      act(() => {
        result.current.handleInteraction({
          point: { x: 100, y: 200 },
          coords: [1.5, 51.5]
        })
      })

      expect(mockDeps.mapState.markers.add).toHaveBeenCalledWith(
        'location',
        [1.5, 51.5],
        { color: 'red' }
      )
    })

    it('clears any existing feature selection', () => {
      mockDeps.pluginState.interactionMode = 'marker'

      const { result } = renderHook(() => useInteractionHandlers(mockDeps))

      act(() => {
        result.current.handleInteraction({
          point: { x: 100, y: 200 },
          coords: [1.5, 51.5]
        })
      })

      expect(mockDeps.pluginState.dispatch).toHaveBeenCalledWith({
        type: 'CLEAR_SELECTED_FEATURES'
      })
    })

    it('emits markerchange event with coordinates', () => {
      mockDeps.pluginState.interactionMode = 'marker'

      const { result } = renderHook(() => useInteractionHandlers(mockDeps))

      act(() => {
        result.current.handleInteraction({
          point: { x: 100, y: 200 },
          coords: [1.5, 51.5]
        })
      })

      expect(mockDeps.services.eventBus.emit).toHaveBeenCalledWith(
        'interact:markerchange',
        { coords: [1.5, 51.5] }
      )
    })

    it('uses configured marker color', () => {
      mockDeps.pluginState.interactionMode = 'marker'
      mockDeps.pluginState.markerColor = 'blue'

      const { result } = renderHook(() => useInteractionHandlers(mockDeps))

      act(() => {
        result.current.handleInteraction({
          point: { x: 0, y: 0 },
          coords: [0, 0]
        })
      })

      expect(mockDeps.mapState.markers.add).toHaveBeenCalledWith(
        'location',
        expect.anything(),
        { color: 'blue' }
      )
    })
  })

  describe('handleInteraction in select mode', () => {
    beforeEach(() => {
      mockDeps.pluginState.interactionMode = 'select'
      mockDeps.pluginState.dataLayers = [
        { layerId: 'parcels', idProperty: 'parcelId' }
      ]
    })

    it('selects feature when clicked on selectable layer', () => {
      const mockFeature = {
        properties: { parcelId: 'P123', name: 'Test Parcel' },
        geometry: { type: 'Polygon', coordinates: [[]] },
        layer: { id: 'parcels' }
      }

      featureQueries.getFeaturesAtPoint.mockReturnValue([mockFeature])
      featureQueries.findMatchingFeature.mockReturnValue({
        feature: mockFeature,
        config: { layerId: 'parcels', idProperty: 'parcelId' }
      })

      const { result } = renderHook(() => useInteractionHandlers(mockDeps))

      act(() => {
        result.current.handleInteraction({
          point: { x: 100, y: 200 },
          coords: [1.5, 51.5]
        })
      })

      expect(mockDeps.pluginState.dispatch).toHaveBeenCalledWith({
        type: 'TOGGLE_SELECTED_FEATURES',
        payload: expect.objectContaining({
          featureId: 'P123',
          layerId: 'parcels',
          idProperty: 'parcelId'
        })
      })
    })

    it('includes feature properties and geometry in selection', () => {
      const mockFeature = {
        properties: { parcelId: 'P123', area: 500 },
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
        layer: { id: 'parcels' }
      }

      featureQueries.getFeaturesAtPoint.mockReturnValue([mockFeature])
      featureQueries.findMatchingFeature.mockReturnValue({
        feature: mockFeature,
        config: { layerId: 'parcels', idProperty: 'parcelId' }
      })

      const { result } = renderHook(() => useInteractionHandlers(mockDeps))

      act(() => {
        result.current.handleInteraction({
          point: { x: 100, y: 200 },
          coords: [1.5, 51.5]
        })
      })

      expect(mockDeps.pluginState.dispatch).toHaveBeenCalledWith({
        type: 'TOGGLE_SELECTED_FEATURES',
        payload: expect.objectContaining({
          properties: { parcelId: 'P123', area: 500 },
          geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }
        })
      })
    })

    it('removes location marker when selecting a feature', () => {
      const mockFeature = {
        properties: { parcelId: 'P123' },
        geometry: { type: 'Point', coordinates: [0, 0] },
        layer: { id: 'parcels' }
      }

      featureQueries.getFeaturesAtPoint.mockReturnValue([mockFeature])
      featureQueries.findMatchingFeature.mockReturnValue({
        feature: mockFeature,
        config: { layerId: 'parcels', idProperty: 'parcelId' }
      })

      const { result } = renderHook(() => useInteractionHandlers(mockDeps))

      act(() => {
        result.current.handleInteraction({
          point: { x: 100, y: 200 },
          coords: [1.5, 51.5]
        })
      })

      expect(mockDeps.mapState.markers.remove).toHaveBeenCalledWith('location')
    })

    it('does nothing when clicking empty area with no marker fallback', () => {
      featureQueries.getFeaturesAtPoint.mockReturnValue([])
      featureQueries.findMatchingFeature.mockReturnValue(null)

      const { result } = renderHook(() => useInteractionHandlers(mockDeps))

      act(() => {
        result.current.handleInteraction({
          point: { x: 100, y: 200 },
          coords: [1.5, 51.5]
        })
      })

      // In pure select mode without auto, clicking empty area does nothing
      expect(mockDeps.mapState.markers.add).not.toHaveBeenCalled()
    })

    it('ignores features without valid id property', () => {
      const mockFeature = {
        properties: { name: 'No ID' }, // Missing parcelId
        geometry: { type: 'Point', coordinates: [0, 0] },
        layer: { id: 'parcels' }
      }

      featureQueries.getFeaturesAtPoint.mockReturnValue([mockFeature])
      featureQueries.findMatchingFeature.mockReturnValue({
        feature: mockFeature,
        config: { layerId: 'parcels', idProperty: 'parcelId' }
      })

      const { result } = renderHook(() => useInteractionHandlers(mockDeps))

      act(() => {
        result.current.handleInteraction({
          point: { x: 100, y: 200 },
          coords: [1.5, 51.5]
        })
      })

      expect(mockDeps.pluginState.dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'TOGGLE_SELECTED_FEATURES' })
      )
    })
  })

  describe('handleInteraction in auto mode', () => {
    beforeEach(() => {
      mockDeps.pluginState.interactionMode = 'auto'
      mockDeps.pluginState.dataLayers = [
        { layerId: 'parcels', idProperty: 'parcelId' }
      ]
    })

    it('selects feature when one is found', () => {
      const mockFeature = {
        properties: { parcelId: 'P123' },
        geometry: { type: 'Point', coordinates: [0, 0] },
        layer: { id: 'parcels' }
      }

      featureQueries.getFeaturesAtPoint.mockReturnValue([mockFeature])
      featureQueries.findMatchingFeature.mockReturnValue({
        feature: mockFeature,
        config: { layerId: 'parcels', idProperty: 'parcelId' }
      })

      const { result } = renderHook(() => useInteractionHandlers(mockDeps))

      act(() => {
        result.current.handleInteraction({
          point: { x: 100, y: 200 },
          coords: [1.5, 51.5]
        })
      })

      expect(mockDeps.pluginState.dispatch).toHaveBeenCalledWith({
        type: 'TOGGLE_SELECTED_FEATURES',
        payload: expect.objectContaining({ featureId: 'P123' })
      })
    })

    it('places marker when no feature found', () => {
      featureQueries.getFeaturesAtPoint.mockReturnValue([])
      featureQueries.findMatchingFeature.mockReturnValue(null)

      const { result } = renderHook(() => useInteractionHandlers(mockDeps))

      act(() => {
        result.current.handleInteraction({
          point: { x: 100, y: 200 },
          coords: [1.5, 51.5]
        })
      })

      expect(mockDeps.mapState.markers.add).toHaveBeenCalledWith(
        'location',
        [1.5, 51.5],
        expect.anything()
      )
    })
  })

  describe('handleInteraction with multiSelect', () => {
    beforeEach(() => {
      mockDeps.pluginState.interactionMode = 'select'
      mockDeps.pluginState.multiSelect = true
      mockDeps.pluginState.dataLayers = [
        { layerId: 'parcels', idProperty: 'parcelId' }
      ]
    })

    it('passes multiSelect flag to dispatch', () => {
      const mockFeature = {
        properties: { parcelId: 'P123' },
        geometry: { type: 'Point', coordinates: [0, 0] },
        layer: { id: 'parcels' }
      }

      featureQueries.getFeaturesAtPoint.mockReturnValue([mockFeature])
      featureQueries.findMatchingFeature.mockReturnValue({
        feature: mockFeature,
        config: { layerId: 'parcels', idProperty: 'parcelId' }
      })

      const { result } = renderHook(() => useInteractionHandlers(mockDeps))

      act(() => {
        result.current.handleInteraction({
          point: { x: 100, y: 200 },
          coords: [1.5, 51.5]
        })
      })

      expect(mockDeps.pluginState.dispatch).toHaveBeenCalledWith({
        type: 'TOGGLE_SELECTED_FEATURES',
        payload: expect.objectContaining({ multiSelect: true })
      })
    })
  })

  describe('handleInteraction without dataLayers', () => {
    it('always places marker in marker mode regardless of features', () => {
      mockDeps.pluginState.interactionMode = 'marker'
      mockDeps.pluginState.dataLayers = []

      const mockFeature = {
        properties: { id: 'F1' },
        layer: { id: 'someLayer' }
      }
      featureQueries.getFeaturesAtPoint.mockReturnValue([mockFeature])

      const { result } = renderHook(() => useInteractionHandlers(mockDeps))

      act(() => {
        result.current.handleInteraction({
          point: { x: 100, y: 200 },
          coords: [1.5, 51.5]
        })
      })

      expect(mockDeps.mapState.markers.add).toHaveBeenCalled()
      expect(mockDeps.pluginState.dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'TOGGLE_SELECTED_FEATURES' })
      )
    })
  })

  describe('selection change event emission', () => {
    it('emits selectionchange when features are selected and bounds exist', () => {
      mockDeps.pluginState.selectedFeatures = [{ featureId: 'F1' }]
      mockDeps.pluginState.selectionBounds = { sw: [0, 0], ne: [1, 1] }

      renderHook(() => useInteractionHandlers(mockDeps))

      expect(mockDeps.services.eventBus.emit).toHaveBeenCalledWith(
        'interact:selectionchange',
        {
          selectedFeatures: [{ featureId: 'F1' }],
          selectionBounds: { sw: [0, 0], ne: [1, 1] }
        }
      )
    })

    it('does not emit selectionchange when bounds are null', () => {
      mockDeps.pluginState.selectedFeatures = [{ featureId: 'F1' }]
      mockDeps.pluginState.selectionBounds = null

      renderHook(() => useInteractionHandlers(mockDeps))

      expect(mockDeps.services.eventBus.emit).not.toHaveBeenCalledWith(
        'interact:selectionchange',
        expect.anything()
      )
    })

    it('does not emit duplicate selectionchange for same selection', () => {
      const selectedFeatures = [{ featureId: 'F1' }]
      mockDeps.pluginState.selectedFeatures = selectedFeatures
      mockDeps.pluginState.selectionBounds = { sw: [0, 0], ne: [1, 1] }

      const { rerender } = renderHook(() => useInteractionHandlers(mockDeps))

      // First render emits
      expect(mockDeps.services.eventBus.emit).toHaveBeenCalledTimes(1)

      // Rerender with same selection reference
      rerender()

      // Should not emit again
      expect(mockDeps.services.eventBus.emit).toHaveBeenCalledTimes(1)
    })
  })
})
