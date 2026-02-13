import { renderHook, act } from '@testing-library/react'
import { useMediaQueryDispatch } from './useMediaQueryDispatch'
import * as getMediaStateModule from '../../utils/getMediaState.js'

describe('useMediaQueryDispatch', () => {
  let dispatch
  let mockMediaQuery

  beforeEach(() => {
    dispatch = jest.fn()

    mockMediaQuery = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }

    // Mock window.matchMedia
    window.matchMedia = jest.fn(() => mockMediaQuery)

    // Mock getMediaState
    jest.spyOn(getMediaStateModule, 'getMediaState').mockReturnValue({
      preferredColorScheme: 'dark',
      prefersReducedMotion: true
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('dispatches media state initially with autoColorScheme true', () => {
    renderHook(() =>
      useMediaQueryDispatch(dispatch, {
        maxMobileWidth: 768,
        minDesktopWidth: 1024,
        appColorScheme: 'light',
        autoColorScheme: true
      })
    )

    // Simulate initial media query "change" event
    const changeHandler = mockMediaQuery.addEventListener.mock.calls[0][1]
    act(() => changeHandler())

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_MEDIA',
      payload: { preferredColorScheme: 'dark', prefersReducedMotion: true }
    })
  })

  it('dispatches media state initially with autoColorScheme false', () => {
    renderHook(() =>
      useMediaQueryDispatch(dispatch, {
        maxMobileWidth: 768,
        minDesktopWidth: 1024,
        appColorScheme: 'light',
        autoColorScheme: false
      })
    )

    const changeHandler = mockMediaQuery.addEventListener.mock.calls[0][1]
    act(() => changeHandler())

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_MEDIA',
      payload: { preferredColorScheme: 'light', prefersReducedMotion: true }
    })
  })

  it('adds event listeners on mount', () => {
    renderHook(() =>
      useMediaQueryDispatch(dispatch, {
        maxMobileWidth: 768,
        minDesktopWidth: 1024,
        appColorScheme: 'light',
        autoColorScheme: true
      })
    )

    expect(mockMediaQuery.addEventListener).toHaveBeenCalledTimes(2)
    expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('removes event listeners on unmount', () => {
    const { unmount } = renderHook(() =>
      useMediaQueryDispatch(dispatch, {
        maxMobileWidth: 768,
        minDesktopWidth: 1024,
        appColorScheme: 'light',
        autoColorScheme: true
      })
    )

    unmount()

    expect(mockMediaQuery.removeEventListener).toHaveBeenCalledTimes(2)
    expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('handles media query changes correctly', () => {
    renderHook(() =>
      useMediaQueryDispatch(dispatch, {
        maxMobileWidth: 768,
        minDesktopWidth: 1024,
        appColorScheme: 'light',
        autoColorScheme: false
      })
    )

    const changeHandler = mockMediaQuery.addEventListener.mock.calls[0][1]
    act(() => changeHandler())

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_MEDIA',
      payload: { preferredColorScheme: 'light', prefersReducedMotion: true }
    })
  })

  it('sets up hybrid media query and dispatches on change', () => {
    const options = {
      behaviour: 'hybrid',
      hybridWidth: 500,
      maxMobileWidth: 768,
      appColorScheme: 'light',
      autoColorScheme: true
    }

    renderHook(() => useMediaQueryDispatch(dispatch, options))

    // Verify matchMedia was called with the hybrid threshold
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 500px)')

    // Verify addEventListener was called for the 2 standard queries + 1 hybrid query
    expect(mockMediaQuery.addEventListener).toHaveBeenCalledTimes(3)

    // Find the hybrid change handler (the last one registered)
    const hybridHandler = mockMediaQuery.addEventListener.mock.calls[2][1]

    // Simulate a media query match event
    act(() => {
      hybridHandler({ matches: true })
    })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_HYBRID_FULLSCREEN',
      payload: true
    })
  })

  it('falls back to maxMobileWidth for hybrid threshold when hybridWidth is missing', () => {
    const options = {
      behaviour: 'hybrid',
      // hybridWidth is undefined here
      maxMobileWidth: 800,
      appColorScheme: 'light',
      autoColorScheme: true
    }

    renderHook(() => useMediaQueryDispatch(dispatch, options))

    // This covers the right side of the ?? operator
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 800px)')

    expect(mockMediaQuery.addEventListener).toHaveBeenCalledTimes(3)
  })
})
