import { renderHook } from '@testing-library/react'
import { useHighlightSync } from './useHighlightSync.js'
import { buildStylesMap } from '../utils/buildStylesMap.js'

jest.mock('../utils/buildStylesMap.js', () => ({
  buildStylesMap: jest.fn(() => ({ layer1: { stroke: 'red', fill: 'blue' } }))
}))

describe('useHighlightSync', () => {
  let mockDeps
  let capturedEventHandler

  beforeEach(() => {
    jest.clearAllMocks()
    capturedEventHandler = null

    mockDeps = {
      mapProvider: {
        updateHighlightedFeatures: jest.fn(() => ({ sw: [0, 0], ne: [1, 1] }))
      },
      mapStyle: { id: 'default-style' },
      pluginState: {
        dataLayers: [{ layerId: 'layer1' }]
      },
      selectedFeatures: [],
      dispatch: jest.fn(),
      events: { MAP_DATA_CHANGE: 'map:datachange' },
      eventBus: {
        on: jest.fn((event, handler) => {
          if (event === 'map:datachange') {
            capturedEventHandler = handler
          }
        }),
        off: jest.fn()
      }
    }
  })

  describe('highlighting selected features', () => {
    it('updates map highlights when features are selected', () => {
      mockDeps.selectedFeatures = [
        { featureId: 'F1', layerId: 'layer1' }
      ]

      renderHook(() => useHighlightSync(mockDeps))

      expect(mockDeps.mapProvider.updateHighlightedFeatures).toHaveBeenCalledWith(
        [{ featureId: 'F1', layerId: 'layer1' }],
        expect.any(Object)
      )
    })

    it('passes styles map to map provider', () => {
      mockDeps.selectedFeatures = [{ featureId: 'F1', layerId: 'layer1' }]
      buildStylesMap.mockReturnValue({ layer1: { stroke: 'purple', fill: 'yellow' } })

      renderHook(() => useHighlightSync(mockDeps))

      expect(mockDeps.mapProvider.updateHighlightedFeatures).toHaveBeenCalledWith(
        expect.anything(),
        { layer1: { stroke: 'purple', fill: 'yellow' } }
      )
    })

    it('dispatches selection bounds after highlighting', () => {
      mockDeps.selectedFeatures = [{ featureId: 'F1', layerId: 'layer1' }]
      mockDeps.mapProvider.updateHighlightedFeatures.mockReturnValue({
        sw: [10, 20],
        ne: [30, 40]
      })

      renderHook(() => useHighlightSync(mockDeps))

      expect(mockDeps.dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_SELECTED_BOUNDS',
        payload: { sw: [10, 20], ne: [30, 40] }
      })
    })

    it('dispatches null bounds when no features selected', () => {
      mockDeps.selectedFeatures = [{ featureId: 'F1', layerId: 'layer1' }]
      mockDeps.mapProvider.updateHighlightedFeatures.mockReturnValue(null)

      renderHook(() => useHighlightSync(mockDeps))

      expect(mockDeps.dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_SELECTED_BOUNDS',
        payload: null
      })
    })
  })

  describe('style recalculation', () => {
    it('recalculates styles when map style changes', () => {
      mockDeps.selectedFeatures = [{ featureId: 'F1' }]

      const { rerender } = renderHook(
        ({ mapStyle }) => useHighlightSync({ ...mockDeps, mapStyle }),
        { initialProps: { mapStyle: { id: 'light' } } }
      )

      buildStylesMap.mockClear()

      rerender({ mapStyle: { id: 'satellite' } })

      expect(buildStylesMap).toHaveBeenCalledWith(
        expect.anything(),
        { id: 'satellite' }
      )
    })

    it('recalculates styles when data layers change', () => {
      mockDeps.selectedFeatures = [{ featureId: 'F1' }]

      const { rerender } = renderHook(
        ({ dataLayers }) => useHighlightSync({
          ...mockDeps,
          pluginState: { dataLayers }
        }),
        { initialProps: { dataLayers: [{ layerId: 'layer1' }] } }
      )

      buildStylesMap.mockClear()

      rerender({ dataLayers: [{ layerId: 'layer1' }, { layerId: 'layer2' }] })

      expect(buildStylesMap).toHaveBeenCalled()
    })
  })

  describe('map data change handling', () => {
    it('refreshes highlights when map data changes', () => {
      mockDeps.selectedFeatures = [{ featureId: 'F1', layerId: 'layer1' }]

      renderHook(() => useHighlightSync(mockDeps))

      // Clear the initial call
      mockDeps.mapProvider.updateHighlightedFeatures.mockClear()

      // Simulate map data change event
      capturedEventHandler()

      expect(mockDeps.mapProvider.updateHighlightedFeatures).toHaveBeenCalled()
    })

    it('stops listening for data changes on unmount', () => {
      mockDeps.selectedFeatures = [{ featureId: 'F1', layerId: 'layer1' }]

      const { unmount } = renderHook(() => useHighlightSync(mockDeps))

      unmount()

      expect(mockDeps.eventBus.off).toHaveBeenCalledWith(
        'map:datachange',
        expect.any(Function)
      )
    })
  })

  describe('guard conditions', () => {
    it('does not update highlights when mapProvider is null', () => {
      mockDeps.mapProvider = null
      mockDeps.selectedFeatures = [{ featureId: 'F1' }]

      renderHook(() => useHighlightSync(mockDeps))

      expect(mockDeps.dispatch).not.toHaveBeenCalled()
    })

    it('does not update highlights when selectedFeatures is null', () => {
      mockDeps.selectedFeatures = null

      renderHook(() => useHighlightSync(mockDeps))

      expect(mockDeps.mapProvider.updateHighlightedFeatures).not.toHaveBeenCalled()
    })

    it('does not update highlights when mapStyle is null', () => {
      mockDeps.mapStyle = null
      mockDeps.selectedFeatures = [{ featureId: 'F1' }]

      renderHook(() => useHighlightSync(mockDeps))

      // stylesMap will be null, so effect should exit early
      expect(mockDeps.mapProvider.updateHighlightedFeatures).not.toHaveBeenCalled()
    })

    it('returns null stylesMap when mapStyle is null', () => {
      mockDeps.mapStyle = null

      renderHook(() => useHighlightSync(mockDeps))

      // buildStylesMap should not be called when mapStyle is null
      // The useMemo returns null early
      expect(buildStylesMap).not.toHaveBeenCalled()
    })
  })

  describe('selection updates', () => {
    it('updates highlights when selection changes', () => {
      const { rerender } = renderHook(
        ({ selectedFeatures }) => useHighlightSync({ ...mockDeps, selectedFeatures }),
        { initialProps: { selectedFeatures: [{ featureId: 'F1' }] } }
      )

      mockDeps.mapProvider.updateHighlightedFeatures.mockClear()

      rerender({ selectedFeatures: [{ featureId: 'F1' }, { featureId: 'F2' }] })

      expect(mockDeps.mapProvider.updateHighlightedFeatures).toHaveBeenCalledWith(
        [{ featureId: 'F1' }, { featureId: 'F2' }],
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
        expect.anything()
      )
    })
  })
})
