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

// ─── projectCoords ────────────────────────────────────────────────────────────

describe('projectCoords', () => {
  const mockProvider = { mapToScreen: jest.fn(() => ({ x: 100, y: 200 })) }

  it('returns scaled coordinates when ready', () => {
    expect(projectCoords({ lat: 1, lng: 1 }, mockProvider, 'medium', true)).toEqual({ x: 200, y: 400 })
  })

  it('returns zero when not ready or no provider', () => {
    expect(projectCoords({ lat: 1, lng: 1 }, mockProvider, 'medium', false)).toEqual({ x: 0, y: 0 })
    expect(projectCoords({ lat: 1, lng: 1 }, null, 'medium', true)).toEqual({ x: 0, y: 0 })
    expect(projectCoords({ lat: 1, lng: 1 }, null, 'medium', false)).toEqual({ x: 0, y: 0 })
  })
})

// ─── useMarkers shared setup ──────────────────────────────────────────────────

const makeCtx = () => {
  const ctx = {
    mockMapProvider: { mapToScreen: jest.fn(() => ({ x: 100, y: 200 })) },
    mockDispatch: jest.fn(),
    mockMarkers: { items: [] },
    mockElement: { style: {} },
    mockEventBus: { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
  }
  eventBus.on = jest.fn()
  eventBus.off = jest.fn()
  useConfig.mockReturnValue({ mapProvider: ctx.mockMapProvider })
  useService.mockReturnValue({ eventBus: ctx.mockEventBus })
  useMap.mockReturnValue({
    markers: ctx.mockMarkers,
    dispatch: ctx.mockDispatch,
    mapSize: 'medium',
    isMapReady: true
  })
  return ctx
}

// ─── useMarkers — API setup ───────────────────────────────────────────────────

describe('useMarkers — API setup', () => {
  let ctx
  beforeEach(() => { ctx = makeCtx() })

  it('returns markers and markerRef', () => {
    const { result } = renderHook(() => useMarkers())
    expect(result.current).toMatchObject({ markers: ctx.mockMarkers, markerRef: expect.any(Function) })
  })

  it('returns early when mapProvider is null', () => {
    useConfig.mockReturnValue({ mapProvider: null })
    ctx.mockMarkers.items = [{ id: 'm1', label: 'Test' }]
    const { result } = renderHook(() => useMarkers())
    expect(result.current.markers.add).toBeUndefined()
    expect(result.current.markers.remove).toBeUndefined()
    expect(result.current.markers.getMarker).toBeUndefined()
    expect(result.current.markers.markerRefs).toBeUndefined()
  })

  it('getMarker returns correct marker', () => {
    ctx.mockMarkers.items = [{ id: 'm1', label: 'First' }, { id: 'm2', label: 'Second' }]
    const { result } = renderHook(() => useMarkers())
    expect(result.current.markers.getMarker('m2')).toEqual({ id: 'm2', label: 'Second' })
    expect(result.current.markers.getMarker('nonexistent')).toBeUndefined()
  })
})

// ─── useMarkers — markerRef and positioning ───────────────────────────────────

describe('useMarkers — markerRef and positioning', () => {
  let ctx
  beforeEach(() => { ctx = makeCtx() })

  it('markerRef stores and removes DOM refs', () => {
    const { result } = renderHook(() => useMarkers())
    const ref = result.current.markerRef('m1')
    act(() => ref(ctx.mockElement))
    expect(result.current.markers.markerRefs.get('m1')).toBe(ctx.mockElement)
    act(() => ref(null))
    expect(result.current.markers.markerRefs.has('m1')).toBe(false)
  })

  it('updateMarkers skips markers with missing coords or no ref', () => {
    ctx.mockMarkers.items = [
      { id: 'm1', coords: { lat: 1, lng: 1 } },
      { id: 'm2', coords: null },
      { id: 'm3', coords: { lat: 0, lng: 0 } }
    ]
    const { result } = renderHook(() => useMarkers())
    act(() => result.current.markerRef('m1')(ctx.mockElement))
    const renderCallback = ctx.mockEventBus.on.mock.calls.find(call => call[0] === 'map:render')[1]
    act(() => renderCallback())
    expect(ctx.mockElement.style.transform).toBe('translate(200px, 400px)')
  })

  it('skips map:render callback when not ready or no provider', () => {
    useMap.mockReturnValue({ markers: ctx.mockMarkers, dispatch: ctx.mockDispatch, mapSize: 'medium', isMapReady: false })
    const { result } = renderHook(() => useMarkers())
    act(() => result.current.markerRef('m1')(ctx.mockElement))
    const renderCallback = ctx.mockEventBus.on.mock.calls.find(call => call[0] === 'map:render')?.[1]
    if (renderCallback) act(() => renderCallback())
  })

  it('updates positions on mapSize change', () => {
    ctx.mockMarkers.items = [{ id: 'm1', coords: { lat: 1, lng: 1 } }]
    const { result, rerender } = renderHook(() => useMarkers())
    act(() => result.current.markerRef('m1')(ctx.mockElement))
    useMap.mockReturnValue({ markers: ctx.mockMarkers, dispatch: ctx.mockDispatch, mapSize: 'large', isMapReady: true })
    rerender()
    expect(ctx.mockElement.style.transform).toBe('translate(300px, 600px)')
  })
})

// ─── useMarkers — add/update/remove event handlers ───────────────────────────

describe('useMarkers — add/update/remove event handlers', () => {
  let ctx
  beforeEach(() => { ctx = makeCtx() })

  it('handles app:addmarker — dispatches with projected coords', () => {
    renderHook(() => useMarkers())
    const handleAddMarker = ctx.mockEventBus.on.mock.calls.find(call => call[0] === 'app:addmarker')[1]
    act(() => handleAddMarker({ id: 'm1', coords: { lat: 1, lng: 1 }, options: { label: 'Test' } }))
    expect(ctx.mockDispatch).toHaveBeenCalledWith({
      type: 'UPSERT_LOCATION_MARKER',
      payload: { id: 'm1', coords: { lat: 1, lng: 1 }, label: 'Test', x: 200, y: 400, isVisible: true }
    })
  })

  it('handles app:addmarker guard — ignores missing id or coords', () => {
    renderHook(() => useMarkers())
    const handleAddMarker = ctx.mockEventBus.on.mock.calls.find(call => call[0] === 'app:addmarker')[1]
    act(() => handleAddMarker(undefined))
    act(() => handleAddMarker(null))
    act(() => handleAddMarker({}))
    act(() => handleAddMarker({ id: 'm1' }))
    expect(ctx.mockDispatch).not.toHaveBeenCalled()
  })

  it('handles app:updatemarker guard — ignores missing id (lines 71-73)', () => {
    ctx.mockMarkers.items = [{ id: 'm1', coords: { lat: 1, lng: 1 } }]
    renderHook(() => useMarkers())
    const handleUpdateMarker = ctx.mockEventBus.on.mock.calls.find(call => call[0] === 'app:updatemarker')[1]
    act(() => handleUpdateMarker(undefined))
    act(() => handleUpdateMarker(null))
    act(() => handleUpdateMarker({}))
    expect(ctx.mockDispatch).not.toHaveBeenCalled()
  })

  it('handles app:updatemarker — dispatches update for valid id (lines 74-75)', () => {
    ctx.mockMarkers.items = [{ id: 'm1', coords: { lat: 1, lng: 1 } }]
    renderHook(() => useMarkers())
    const handleUpdateMarker = ctx.mockEventBus.on.mock.calls.find(call => call[0] === 'app:updatemarker')[1]
    act(() => handleUpdateMarker({ id: 'm1', options: { showLabel: true } }))
    expect(ctx.mockDispatch).toHaveBeenCalledWith({
      type: 'UPSERT_LOCATION_MARKER',
      payload: { id: 'm1', coords: { lat: 1, lng: 1 }, showLabel: true, x: 200, y: 400 }
    })
  })

  it('handles app:removemarker — dispatches and guards null/undefined', () => {
    renderHook(() => useMarkers())
    const handleRemoveMarker = ctx.mockEventBus.on.mock.calls.find(call => call[0] === 'app:removemarker')[1]
    act(() => handleRemoveMarker('m1'))
    expect(ctx.mockDispatch).toHaveBeenCalledWith({ type: 'REMOVE_LOCATION_MARKER', payload: 'm1' })
    act(() => handleRemoveMarker(undefined))
    act(() => handleRemoveMarker(null))
    expect(ctx.mockDispatch).toHaveBeenCalledTimes(1)
  })
})

// ─── useMarkers — markers.update ─────────────────────────────────────────────

describe('useMarkers — markers.update', () => {
  let ctx
  beforeEach(() => { ctx = makeCtx() })

  it('dispatches using existing coords when none provided (lines 127-134)', () => {
    ctx.mockMarkers.items = [{ id: 'm1', coords: { lat: 1, lng: 1 }, label: 'Old' }]
    const { result } = renderHook(() => useMarkers())
    act(() => result.current.markers.update('m1', { showLabel: true }))
    expect(ctx.mockDispatch).toHaveBeenCalledWith({
      type: 'UPSERT_LOCATION_MARKER',
      payload: { id: 'm1', coords: { lat: 1, lng: 1 }, showLabel: true, x: 200, y: 400 }
    })
  })

  it('is a no-op when marker id is not found (lines 128-130)', () => {
    ctx.mockMarkers.items = []
    const { result } = renderHook(() => useMarkers())
    act(() => result.current.markers.update('nonexistent', { showLabel: true }))
    expect(ctx.mockDispatch).not.toHaveBeenCalled()
  })

  it('uses provided coords over existing (lines 131-133)', () => {
    ctx.mockMarkers.items = [{ id: 'm1', coords: { lat: 1, lng: 1 } }]
    const { result } = renderHook(() => useMarkers())
    const newCoords = { lat: 5, lng: 5 }
    act(() => result.current.markers.update('m1', { coords: newCoords, showLabel: true }))
    expect(ctx.mockDispatch).toHaveBeenCalledWith({
      type: 'UPSERT_LOCATION_MARKER',
      payload: { id: 'm1', coords: newCoords, showLabel: true, x: 200, y: 400 }
    })
  })

  it('uses default empty options when none provided (line 126)', () => {
    ctx.mockMarkers.items = [{ id: 'm1', coords: { lat: 1, lng: 1 } }]
    const { result } = renderHook(() => useMarkers())
    act(() => result.current.markers.update('m1'))
    expect(ctx.mockDispatch).toHaveBeenCalledWith({
      type: 'UPSERT_LOCATION_MARKER',
      payload: { id: 'm1', coords: { lat: 1, lng: 1 }, x: 200, y: 400 }
    })
  })
})

// ─── useMarkers — cleanup ─────────────────────────────────────────────────────

describe('useMarkers — cleanup', () => {
  let ctx
  beforeEach(() => { ctx = makeCtx() })

  it('cleans up map:render listener when markerRef is called with null', () => {
    const { result } = renderHook(() => useMarkers())
    let cleanup
    act(() => { cleanup = result.current.markerRef('m1')(ctx.mockElement) })
    const updateCallback = ctx.mockEventBus.on.mock.calls.find(call => call[0] === 'map:render')[1]
    act(() => { if (cleanup) cleanup() })
    expect(ctx.mockEventBus.off).toHaveBeenCalledWith('map:render', updateCallback)
  })

  it('cleans up add/update/remove eventBus listeners on unmount', () => {
    const { unmount } = renderHook(() => useMarkers())
    const addCallback = ctx.mockEventBus.on.mock.calls.find(call => call[0] === 'app:addmarker')[1]
    const updateCallback = ctx.mockEventBus.on.mock.calls.find(call => call[0] === 'app:updatemarker')[1]
    const removeCallback = ctx.mockEventBus.on.mock.calls.find(call => call[0] === 'app:removemarker')[1]
    unmount()
    expect(ctx.mockEventBus.off).toHaveBeenCalledWith('app:addmarker', addCallback)
    expect(ctx.mockEventBus.off).toHaveBeenCalledWith('app:updatemarker', updateCallback)
    expect(ctx.mockEventBus.off).toHaveBeenCalledWith('app:removemarker', removeCallback)
  })
})
