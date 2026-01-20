import { renderHook, act } from '@testing-library/react'
import { useMarkers, projectCoords } from './useMarkersAPI.js'
import { useConfig } from '../store/configContext.js'
import { useMap } from '../store/mapContext.js'
import { useService } from '../store/serviceContext.js'
import eventBus from '../../services/eventBus.js'

jest.mock('../store/configContext.js')
jest.mock('../store/mapContext.js')
jest.mock('../store/serviceContext.js')
jest.mock('../../services/eventBus.js', () => ({
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn()
}))
jest.mock('../../config/appConfig.js', () => ({ scaleFactor: { small: 1, medium: 2, large: 3 } }))

describe('projectCoords', () => {
  const mockProvider = { mapToScreen: jest.fn(() => ({ x: 100, y: 200 })) }

  it('returns scaled coordinates when ready', () => {
    expect(projectCoords({ lat: 1, lng: 1 }, mockProvider, 'medium', true)).toEqual({ x: 200, y: 381 })
  })

  it('returns zero when not ready or no provider', () => {
    expect(projectCoords({ lat: 1, lng: 1 }, mockProvider, 'medium', false)).toEqual({ x: 0, y: 0 })
    expect(projectCoords({ lat: 1, lng: 1 }, null, 'medium', true)).toEqual({ x: 0, y: 0 })
    expect(projectCoords({ lat: 1, lng: 1 }, null, 'medium', false)).toEqual({ x: 0, y: 0 })
  })
})

describe('useMarkers', () => {
  let mockMapProvider, mockDispatch, mockMarkers, mockElement, mockEventBus

  beforeEach(() => {
    mockMapProvider = { mapToScreen: jest.fn(() => ({ x: 100, y: 200 })) }
    mockDispatch = jest.fn()
    mockMarkers = { items: [] }
    mockElement = { style: {} }
    mockEventBus = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }

    eventBus.on = jest.fn()
    eventBus.off = jest.fn()

    useConfig.mockReturnValue({ mapProvider: mockMapProvider })
    useService.mockReturnValue({ eventBus: mockEventBus })
    useMap.mockReturnValue({
      markers: mockMarkers,
      dispatch: mockDispatch,
      mapSize: 'medium',
      isMapReady: true
    })
  })

  it('returns markers and markerRef', () => {
    const { result } = renderHook(() => useMarkers())
    expect(result.current).toMatchObject({ markers: mockMarkers, markerRef: expect.any(Function) })
  })

  it('returns early when mapProvider is null (line 24)', () => {
    useConfig.mockReturnValue({ mapProvider: null })
    mockMarkers.items = [{ id: 'm1', label: 'Test' }]

    const { result } = renderHook(() => useMarkers())

    // The markers object should not have the API methods attached
    expect(result.current.markers.add).toBeUndefined()
    expect(result.current.markers.remove).toBeUndefined()
    expect(result.current.markers.getMarker).toBeUndefined()
    expect(result.current.markers.markerRefs).toBeUndefined()
  })

  it('getMarker returns correct marker', () => {
    mockMarkers.items = [{ id: 'm1', label: 'First' }, { id: 'm2', label: 'Second' }]
    const { result } = renderHook(() => useMarkers())

    // Found
    expect(result.current.markers.getMarker('m2')).toEqual({ id: 'm2', label: 'Second' })
    // Not found
    expect(result.current.markers.getMarker('nonexistent')).toBeUndefined()
  })

  it('markerRef stores and removes refs (line 54)', () => {
    const { result } = renderHook(() => useMarkers())
    const ref = result.current.markerRef('m1')

    act(() => ref(mockElement))
    expect(result.current.markers.markerRefs.get('m1')).toBe(mockElement)

    act(() => ref(null)) // line 54 early return
    expect(result.current.markers.markerRefs.has('m1')).toBe(false)
  })

  it('updateMarkers skips missing coords or ref (line 71)', () => {
    mockMarkers.items = [
      { id: 'm1', coords: { lat: 1, lng: 1 } },
      { id: 'm2', coords: null }, // line 71: missing coords
      { id: 'm3', coords: { lat: 0, lng: 0 } } // line 71: missing ref
    ]
    const { result } = renderHook(() => useMarkers())
    act(() => result.current.markerRef('m1')(mockElement))

    const renderCallback = mockEventBus.on.mock.calls.find(call => call[0] === 'map:render')[1]
    act(() => renderCallback())
    expect(mockElement.style.transform).toBe('translate(200px, 381px)')
  })

  it('skips map:render when not ready or no provider (line 60)', () => {
    useMap.mockReturnValue({ markers: mockMarkers, dispatch: mockDispatch, mapSize: 'medium', isMapReady: false })
    const { result } = renderHook(() => useMarkers())
    act(() => result.current.markerRef('m1')(mockElement))

    const renderCallback = mockEventBus.on.mock.calls.find(call => call[0] === 'map:render')?.[1]
    if (renderCallback) act(() => renderCallback()) // line 60: early return
  })

  it('updates positions on mapSize change', () => {
    mockMarkers.items = [{ id: 'm1', coords: { lat: 1, lng: 1 } }]
    const { result, rerender } = renderHook(() => useMarkers())
    act(() => result.current.markerRef('m1')(mockElement))

    useMap.mockReturnValue({
      markers: mockMarkers,
      dispatch: mockDispatch,
      mapSize: 'large',
      isMapReady: true
    })
    rerender()
    expect(mockElement.style.transform).toBe('translate(300px, 581px)')
  })

  it('handles app:addmarker safely', () => {
    renderHook(() => useMarkers())
    const addPayload = { id: 'm1', coords: { lat: 1, lng: 1 }, options: { label: 'Test' } }

    const handleAddMarker = mockEventBus.on.mock.calls.find(call => call[0] === 'app:addmarker')[1]
    act(() => handleAddMarker(addPayload))
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPSERT_LOCATION_MARKER',
      payload: { id: 'm1', coords: { lat: 1, lng: 1 }, label: 'Test', x: 200, y: 381, isVisible: true }
    })
  })

  it('does not crash on undefined/null payload', () => {
    renderHook(() => useMarkers())
    const handleAddMarker = mockEventBus.on.mock.calls.find(call => call[0] === 'app:addmarker')[1]

    act(() => handleAddMarker(undefined))
    act(() => handleAddMarker(null))
    act(() => handleAddMarker({})) // missing id
    act(() => handleAddMarker({ id: 'm1' })) // missing coords
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('handles app:removemarker safely (guard)', () => {
    renderHook(() => useMarkers())
    const handleRemoveMarker = mockEventBus.on.mock.calls.find(call => call[0] === 'app:removemarker')[1]

    act(() => handleRemoveMarker('m1')) // valid id
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'REMOVE_LOCATION_MARKER', payload: 'm1' })

    act(() => handleRemoveMarker(undefined)) // guard triggers
    act(() => handleRemoveMarker(null))
    expect(mockDispatch).toHaveBeenCalledTimes(1)
  })

  it('cleans up map:render listener on unmount', () => {
    const { result } = renderHook(() => useMarkers())

    let cleanup
    act(() => { cleanup = result.current.markerRef('m1')(mockElement) })

    const updateCallback = mockEventBus.on.mock.calls.find(call => call[0] === 'map:render')[1]
    act(() => { if (cleanup) cleanup() })

    expect(mockEventBus.off).toHaveBeenCalledWith('map:render', updateCallback)
  })

  it('cleans up eventBus listeners on unmount', () => {
    const { unmount } = renderHook(() => useMarkers())

    // Get the registered callbacks
    const addCallback = mockEventBus.on.mock.calls.find(call => call[0] === 'app:addmarker')[1]
    const removeCallback = mockEventBus.on.mock.calls.find(call => call[0] === 'app:removemarker')[1]

    unmount()

    // Verify both listeners were removed
    expect(mockEventBus.off).toHaveBeenCalledWith('app:addmarker', addCallback)
    expect(mockEventBus.off).toHaveBeenCalledWith('app:removemarker', removeCallback)
  })
})
