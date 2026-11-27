import { renderHook, act } from '@testing-library/react'
import { useCrossHair } from './useCrossHairAPI.js'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { useService } from '../store/serviceContext.js'
import eventBus from '../../services/eventBus.js'

jest.mock('../store/configContext.js')
jest.mock('../store/appContext.js')
jest.mock('../store/mapContext.js')
jest.mock('../store/serviceContext.js')
jest.mock('../../services/eventBus.js', () => ({
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn()
}))
jest.mock('../../config/appConfig.js', () => ({ scaleFactor: { small: 1, medium: 2, large: 3 } }))

describe('useCrossHair', () => {
  let mockMapProvider, mockDispatch, mockCrossHair, mockElement, mockEventBus

  beforeEach(() => {
    mockMapProvider = {
      mapToScreen: jest.fn(() => ({ x: 100, y: 200 })),
      getCenter: jest.fn(() => ({ lat: 0, lng: 0 })),
      getZoom: jest.fn(() => 10)
    }
    mockDispatch = jest.fn()
    mockCrossHair = { coords: null, isPinnedToMap: false, state: 'default' }
    mockElement = { style: {} }
    mockEventBus = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }

    eventBus.on = jest.fn()
    eventBus.off = jest.fn()

    useConfig.mockReturnValue({ mapProvider: mockMapProvider })
    useApp.mockReturnValue({ safeZoneInset: { left: 10, top: 20 }, expandedButtons: new Set() })
    useService.mockReturnValue({ eventBus: mockEventBus })
    useMap.mockReturnValue({
      crossHair: mockCrossHair,
      dispatch: mockDispatch,
      mapSize: 'medium'
    })
  })

  const setup = () => {
    const hook = renderHook(() => useCrossHair())
    act(() => hook.result.current.crossHairRef(mockElement))
    return hook
  }

  it('returns crossHair and crossHairRef', () => {
    const { result } = renderHook(() => useCrossHair())
    expect(result.current).toMatchObject({ crossHair: mockCrossHair, crossHairRef: expect.any(Function) })
  })

  it('handles null element', () => {
    const { result } = renderHook(() => useCrossHair())
    act(() => result.current.crossHairRef(null))
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('returns early when no safeZoneInset', () => {
    useApp.mockReturnValue({ safeZoneInset: null })
    const { result } = renderHook(() => useCrossHair())
    act(() => result.current.crossHairRef(mockElement))
    act(() => mockCrossHair.pinToMap({ lat: 1, lng: 1 }))
    expect(mockElement.style.transform).toBeUndefined()
    expect(mockElement.style.display).toBeUndefined()
  })

  it('pinToMap updates position', () => {
    setup()
    act(() => mockCrossHair.pinToMap({ lat: 1, lng: 1 }, 'active'))
    expect(mockElement.style.transform).toBe('translate(190px, 380px)')
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_CROSS_HAIR',
      payload: { isPinnedToMap: true, isVisible: true, coords: { lat: 1, lng: 1 }, state: 'active' }
    })
  })

  it('fixAtCenter centers marker', () => {
    setup()
    act(() => mockCrossHair.fixAtCenter())
    expect(mockElement.style).toMatchObject({ left: '50%', top: '50%', transform: 'translate(0,0)' })
  })

  it('remove/show/hide toggle visibility', () => {
    setup()
    act(() => mockCrossHair.remove())
    expect(mockElement.style.display).toBe('none')

    act(() => mockCrossHair.show())
    expect(mockElement.style.display).toBe('block')

    act(() => mockCrossHair.hide())
    expect(mockElement.style.display).toBe('none')
  })

  const withMapControls = (isOpen) => useApp.mockReturnValue({
    safeZoneInset: { left: 10, top: 20 },
    expandedButtons: new Set(isOpen ? ['mapControls'] : [])
  })

  it('holds back hide() while the map controls are open', () => {
    withMapControls(true)
    setup()
    act(() => mockCrossHair.show())
    act(() => mockCrossHair.hide())
    expect(mockElement.style.display).toBe('block')
    expect(mockDispatch).not.toHaveBeenCalledWith({ type: 'UPDATE_CROSS_HAIR', payload: { isVisible: false } })
  })

  // UPDATE_CROSS_HAIR replaces the crossHair object, and a plugin can still call an older copy
  // (draw's effect cleanup does)
  const replaceCrossHair = (hook) => {
    const olderCopy = mockCrossHair
    mockCrossHair = { ...mockCrossHair }
    useMap.mockReturnValue({ crossHair: mockCrossHair, dispatch: mockDispatch, mapSize: 'medium' })
    hook.rerender()
    act(() => hook.result.current.crossHairRef(mockElement))
    return olderCopy
  }

  it('hides when an older copy calls hide() after the map controls close', () => {
    withMapControls(true)
    const hook = setup()
    act(() => mockCrossHair.show())
    const olderCopy = replaceCrossHair(hook)
    withMapControls(false)
    hook.rerender()
    act(() => olderCopy.hide())
    expect(mockElement.style.display).toBe('none')
  })

  it('carries out a hide() held back on an older copy once the map controls close', () => {
    withMapControls(true)
    const hook = setup()
    act(() => mockCrossHair.show())
    const olderCopy = replaceCrossHair(hook)
    act(() => olderCopy.hide())
    expect(mockElement.style.display).toBe('block')
    withMapControls(false)
    hook.rerender()
    expect(mockElement.style.display).toBe('none')
  })

  // A plugin's updateCrossHair effect can run before this hook re-renders, so its hide() is
  // held back as the map controls close.
  const closeMapControlsAfterBlockedHide = ({ showInBetween } = {}) => {
    withMapControls(true)
    const hook = setup()
    act(() => mockCrossHair.show())
    act(() => mockCrossHair.hide())
    if (showInBetween) {
      act(() => mockCrossHair.fixAtCenter())
    }
    withMapControls(false)
    hook.rerender()
  }

  it('carries out a hide() blocked by MapControls once it closes', () => {
    closeMapControlsAfterBlockedHide()
    expect(mockElement.style.display).toBe('none')
    expect(mockDispatch).toHaveBeenLastCalledWith({ type: 'UPDATE_CROSS_HAIR', payload: { isVisible: false } })
  })

  it('drops a blocked hide() when the crosshair is shown again before MapControls closes', () => {
    closeMapControlsAfterBlockedHide({ showInBetween: true })
    expect(mockElement.style.display).toBe('block')
  })

  it('setStyle updates state', () => {
    setup()
    act(() => mockCrossHair.setStyle('highlighted'))
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_CROSS_HAIR',
      payload: { state: 'highlighted' }
    })
  })

  it('getDetail returns correct data for pinned/unpinned', () => {
    setup()

    mockCrossHair.isPinnedToMap = true
    mockCrossHair.coords = { lat: 5, lng: 10 }
    expect(mockCrossHair.getDetail()).toMatchObject({ coords: { lat: 5, lng: 10 }, zoom: 10 })

    mockCrossHair.isPinnedToMap = false
    expect(mockCrossHair.getDetail()).toMatchObject({ coords: { lat: 0, lng: 0 } })
    expect(mockMapProvider.getCenter).toHaveBeenCalled()
  })

  it('subscribes and updates on map:render', () => {
    setup()
    expect(mockEventBus.on).toHaveBeenCalledWith('map:render', expect.any(Function))

    mockCrossHair.coords = { lat: 1, lng: 1 }
    mockCrossHair.isPinnedToMap = true

    act(() => mockEventBus.on.mock.calls[0][1]())
    expect(mockElement.style.transform).toBe('translate(190px, 380px)')
  })

  it('skips map:render update when not pinned', () => {
    setup()

    mockCrossHair.coords = { lat: 1, lng: 1 }
    mockCrossHair.isPinnedToMap = false

    const handleRender = mockEventBus.on.mock.calls[0][1]
    act(() => handleRender())

    expect(mockElement.style.transform).toBeUndefined()
  })

  it('unsubscribes on cleanup', () => {
    const { result } = renderHook(() => useCrossHair())
    let cleanup
    act(() => { cleanup = result.current.crossHairRef(mockElement) })
    act(() => cleanup())
    expect(mockEventBus.off).toHaveBeenCalledWith('map:render', expect.any(Function))
  })

  it('re-pins on mapSize change', () => {
    const { rerender } = setup()

    mockCrossHair.coords = { lat: 1, lng: 1 }
    mockCrossHair.isPinnedToMap = true
    mockDispatch.mockClear()

    useMap.mockReturnValue({ crossHair: mockCrossHair, dispatch: mockDispatch, mapSize: 'large' })
    rerender()

    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'UPDATE_CROSS_HAIR' }))
  })

  it('skips re-pin when not pinned', () => {
    const { rerender } = setup()
    mockDispatch.mockClear()

    useMap.mockReturnValue({ crossHair: mockCrossHair, dispatch: mockDispatch, mapSize: 'large' })
    rerender()

    expect(mockDispatch).not.toHaveBeenCalled()
  })
})
