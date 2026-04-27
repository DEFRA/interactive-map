import { renderHook, act } from '@testing-library/react'
import { useFeatureItems } from './useFeatureItems.js'

const makeEventBus = () => {
  const listeners = {}
  return {
    on: jest.fn((e, fn) => { listeners[e] = fn }),
    off: jest.fn(),
    emit: (e, payload) => listeners[e]?.(payload)
  }
}

// ─── useFeatureItems — initial state ─────────────────────────────────────────

describe('useFeatureItems — initial state', () => {
  it('returns an empty array before any event is received', () => {
    const { result } = renderHook(() => useFeatureItems(makeEventBus()))
    expect(result.current).toEqual([])
  })

  it('returns an empty array when eventBus is undefined', () => {
    const { result } = renderHook(() => useFeatureItems(undefined))
    expect(result.current).toEqual([])
  })
})

// ─── useFeatureItems — event subscription ────────────────────────────────────

describe('useFeatureItems — event subscription', () => {
  it('subscribes to features:setItems on mount', () => {
    const eb = makeEventBus()
    renderHook(() => useFeatureItems(eb))
    expect(eb.on).toHaveBeenCalledWith('features:setItems', expect.any(Function))
  })

  it('unsubscribes on unmount', () => {
    const eb = makeEventBus()
    const { unmount } = renderHook(() => useFeatureItems(eb))
    unmount()
    expect(eb.off).toHaveBeenCalledWith('features:setItems', expect.any(Function))
  })

  it('does not subscribe when eventBus is undefined', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    renderHook(() => useFeatureItems(undefined))
    spy.mockRestore()
  })
})

// ─── useFeatureItems — updates ────────────────────────────────────────────────

describe('useFeatureItems — updates', () => {
  it('updates items when features:setItems is emitted', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureItems(eb))
    const items = [{ id: 'a', label: 'Feature A' }, { id: 'b', label: 'Feature B' }]
    act(() => eb.emit('features:setItems', { items }))
    expect(result.current).toEqual(items)
  })

  it('clears items when emitted with an empty array', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureItems(eb))
    act(() => eb.emit('features:setItems', { items: [{ id: 'a', label: 'A' }] }))
    act(() => eb.emit('features:setItems', { items: [] }))
    expect(result.current).toEqual([])
  })

  it('defaults to empty array when items key is missing from payload', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureItems(eb))
    act(() => eb.emit('features:setItems', {}))
    expect(result.current).toEqual([])
  })
})
