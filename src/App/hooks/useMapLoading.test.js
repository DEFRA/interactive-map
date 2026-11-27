import { renderHook, act } from '@testing-library/react'
import { useMapLoading } from './useMapLoading'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'

jest.mock('../store/configContext.js')
jest.mock('../store/appContext.js')

const createMapLoading = ({ isLoading = true } = {}) => {
  const listeners = new Set()
  const mapLoading = {
    attachTo: jest.fn(),
    isLoading: jest.fn(() => isLoading),
    onDismiss: jest.fn((listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }),
    end: () => {
      isLoading = false
      listeners.forEach(listener => listener())
    },
    listenerCount: () => listeners.size
  }
  return mapLoading
}

describe('useMapLoading', () => {
  const appEl = document.createElement('div')

  beforeEach(() => {
    useApp.mockReturnValue({ layoutRefs: { appContainerRef: { current: appEl } } })
  })

  it('moves the loading overlay into the app on mount', () => {
    const mapLoading = createMapLoading()
    useConfig.mockReturnValue({ mapLoading })

    const { rerender } = renderHook(() => useMapLoading())
    rerender()

    expect(mapLoading.attachTo).toHaveBeenCalledTimes(1)
    expect(mapLoading.attachTo).toHaveBeenCalledWith(appEl)
  })

  it('reports loading until loading ends', () => {
    const mapLoading = createMapLoading()
    useConfig.mockReturnValue({ mapLoading })

    const { result, unmount } = renderHook(() => useMapLoading())
    expect(result.current).toBe(true)

    act(() => mapLoading.end())
    expect(result.current).toBe(false)

    unmount()
    expect(mapLoading.listenerCount()).toBe(0)
  })

  it('reports not loading when loading ended before it started listening', () => {
    const mapLoading = createMapLoading()
    mapLoading.isLoading.mockReturnValueOnce(true).mockReturnValue(false)
    useConfig.mockReturnValue({ mapLoading })

    const { result } = renderHook(() => useMapLoading())

    expect(result.current).toBe(false)
  })

  it('reports not loading when map loading is off', () => {
    useConfig.mockReturnValue({})

    const { result } = renderHook(() => useMapLoading())

    expect(result.current).toBe(false)
  })
})
