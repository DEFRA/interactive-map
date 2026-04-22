import { renderHook, act } from '@testing-library/react'
import { useMapURLSync } from './useMapURLSync'
import { useConfig } from '../store/configContext.js'
import { useService } from '../store/serviceContext.js'
import * as mapStateSync from '../../utils/mapStateSync.js'

jest.mock('../store/configContext.js')
jest.mock('../store/serviceContext.js')
jest.mock('../../utils/mapStateSync.js', () => ({
  setMapStateInURL: jest.fn()
}))

describe('useMapURLSync', () => {
  let handleEvent
  let mockEventBus

  beforeEach(() => {
    handleEvent = undefined
    mockEventBus = {
      on: jest.fn((_, fn) => { handleEvent = fn }),
      off: jest.fn(),
      emit: jest.fn()
    }
    useService.mockReturnValue({ eventBus: mockEventBus })
  })

  it('registers map:stateupdated listener and cleans up', () => {
    useConfig.mockReturnValue({ id: 'map123', urlPosition: 'sync' })

    const { unmount } = renderHook(() => useMapURLSync())
    expect(mockEventBus.on).toHaveBeenCalledWith('map:stateupdated', expect.any(Function))

    unmount()
    expect(mockEventBus.off).toHaveBeenCalledWith('map:stateupdated', handleEvent)
  })

  it('calls setMapStateInURL on map:stateupdated', () => {
    useConfig.mockReturnValue({ id: 'map123', urlPosition: 'sync' })

    renderHook(() => useMapURLSync())

    act(() => {
      handleEvent({ current: { center: [1, 2], zoom: 5 } })
    })

    expect(mapStateSync.setMapStateInURL).toHaveBeenCalledWith('map123', {
      center: [1, 2],
      zoom: 5
    })
  })

  it('does nothing if id is falsy', () => {
    useConfig.mockReturnValue({ id: null, urlPosition: 'sync' })

    const { unmount } = renderHook(() => useMapURLSync())
    expect(mockEventBus.on).not.toHaveBeenCalled()
    expect(mockEventBus.off).not.toHaveBeenCalled()

    unmount() // cleanup should not throw
  })

  it('does not register listener when urlPosition is none', () => {
    useConfig.mockReturnValue({ id: 'map123', urlPosition: 'none' })

    const { unmount } = renderHook(() => useMapURLSync())
    expect(mockEventBus.on).not.toHaveBeenCalled()

    unmount()
    expect(mockEventBus.off).not.toHaveBeenCalled()
  })

  it('does not register listener when urlPosition is readOnly', () => {
    useConfig.mockReturnValue({ id: 'map123', urlPosition: 'readOnly' })

    renderHook(() => useMapURLSync())
    expect(mockEventBus.on).not.toHaveBeenCalled()
  })
})
