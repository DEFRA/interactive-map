import { renderHook, act } from '@testing-library/react'
import { useFeatureItems } from './useFeatureItems.js'

const SET_FEATURES = 'map:setfeatures' // NOSONAR

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
  it('returns empty items and multiselectable false before any event', () => {
    const { result } = renderHook(() => useFeatureItems(makeEventBus()))
    expect(result.current.items).toEqual([])
    expect(result.current.multiselectable).toBe(false)
  })

  it('returns empty items and multiselectable false when eventBus is undefined', () => {
    const { result } = renderHook(() => useFeatureItems(undefined))
    expect(result.current.items).toEqual([])
    expect(result.current.multiselectable).toBe(false)
  })
})

// ─── useFeatureItems — event subscription ────────────────────────────────────

describe('useFeatureItems — event subscription', () => {
  it('subscribes to map:setfeatures on mount', () => {
    const eb = makeEventBus()
    renderHook(() => useFeatureItems(eb))
    expect(eb.on).toHaveBeenCalledWith(SET_FEATURES, expect.any(Function))
  })

  it('unsubscribes on unmount', () => {
    const eb = makeEventBus()
    const { unmount } = renderHook(() => useFeatureItems(eb))
    unmount()
    expect(eb.off).toHaveBeenCalledWith(SET_FEATURES, expect.any(Function))
  })

  it('does not subscribe when eventBus is undefined', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    renderHook(() => useFeatureItems(undefined))
    spy.mockRestore()
  })
})

// ─── useFeatureItems — items updates ─────────────────────────────────────────

describe('useFeatureItems — items updates', () => {
  it('updates items when map:setfeatures is emitted', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureItems(eb))
    const items = [{ id: 'a', label: 'Feature A' }, { id: 'b', label: 'Feature B' }]
    act(() => eb.emit(SET_FEATURES, { items }))
    expect(result.current.items).toEqual(items)
  })

  it('clears items when emitted with an empty array', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureItems(eb))
    act(() => eb.emit(SET_FEATURES, { items: [{ id: 'a', label: 'A' }] }))
    act(() => eb.emit(SET_FEATURES, { items: [] }))
    expect(result.current.items).toEqual([])
  })

  it('defaults items to empty array when items key is missing from payload', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureItems(eb))
    act(() => eb.emit(SET_FEATURES, {}))
    expect(result.current.items).toEqual([])
  })
})

// ─── useFeatureItems — multiselectable updates ───────────────────────────────

describe('useFeatureItems — multiselectable updates', () => {
  it('sets multiselectable true when emitted with multiselectable: true', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureItems(eb))
    act(() => eb.emit(SET_FEATURES, { items: [], multiselectable: true }))
    expect(result.current.multiselectable).toBe(true)
  })

  it('defaults multiselectable to false when not present in payload', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureItems(eb))
    act(() => eb.emit(SET_FEATURES, { items: [] }))
    expect(result.current.multiselectable).toBe(false)
  })
})
