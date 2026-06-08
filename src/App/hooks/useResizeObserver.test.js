import { renderHook } from '@testing-library/react'
import { useResizeObserver } from './useResizeObserver'

describe('useResizeObserver', () => {
  let observeMock, disconnectMock, entry, callback
  let originalResizeObserver

  beforeAll(() => {
    originalResizeObserver = global.ResizeObserver
  })

  afterAll(() => {
    global.ResizeObserver = originalResizeObserver
  })

  beforeEach(() => {
    observeMock = jest.fn()
    disconnectMock = jest.fn()
    callback = jest.fn()
    entry = { target: {}, contentRect: { width: 100, height: 200 } }

    // Mock ResizeObserver
    global.ResizeObserver = jest.fn(function (cb) {
      this.observe = observeMock
      this.disconnect = disconnectMock
      this.trigger = (entries) => cb(entries) // helper to simulate resize
    })

    jest.spyOn(global, 'requestAnimationFrame').mockImplementation(cb => { cb(); return 0 })
    jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('does nothing if no elements or callback', () => {
    const ref = { current: null }
    const { unmount } = renderHook(() => useResizeObserver(ref, null))
    unmount()
    expect(observeMock).not.toHaveBeenCalled()
    expect(disconnectMock).not.toHaveBeenCalled()
  })

  it('observes element and calls callback on size change, skips same size', () => {
    const ref = { current: {} }
    const { unmount } = renderHook(() => useResizeObserver(ref, callback))

    const roInstance = global.ResizeObserver.mock.instances[0]

    // first resize → triggers callback
    roInstance.trigger([entry])
    expect(observeMock).toHaveBeenCalledWith(ref.current)
    expect(callback).toHaveBeenCalledWith(entry)

    // same size → should skip callback
    callback.mockClear()
    roInstance.trigger([entry])
    expect(callback).not.toHaveBeenCalled()

    // different size → triggers callback
    const newEntry = { target: entry.target, contentRect: { width: 120, height: 250 } }
    roInstance.trigger([newEntry])
    expect(callback).toHaveBeenCalledWith(newEntry)

    unmount()
    expect(disconnectMock).toHaveBeenCalled()
  })

  it('supports multiple refs and skips null refs', () => {
    const ref1 = { current: {} }
    const ref2 = { current: null }
    const ref3 = { current: {} }
    const { unmount } = renderHook(() => useResizeObserver([ref1, ref2, ref3], callback))

    expect(observeMock).toHaveBeenCalledTimes(2)
    expect(observeMock).toHaveBeenCalledWith(ref1.current)
    expect(observeMock).toHaveBeenCalledWith(ref3.current)

    unmount()
    expect(disconnectMock).toHaveBeenCalled()
  })

  it('cancels animation frame on unmount if frameRef.current is set', () => {
    const ref = { current: {} }
    // result.current now contains { frameRef }
    const { result, unmount } = renderHook(() => useResizeObserver(ref, callback))

    // ⬅️ CORRECTED: Access frameRef via result.current
    result.current.frameRef.current = 123
    unmount()

    expect(global.cancelAnimationFrame).toHaveBeenCalledWith(123)
  })
})
