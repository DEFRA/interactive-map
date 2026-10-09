import { renderHook, act } from '@testing-library/react'
import { useSpatialListItems } from './useSpatialListItems.js'

const SET_FEATURES = 'map:setspatiallist' // NOSONAR
const SET_FEATURES_SUPPRESSED = 'map:setspatiallistsuppressed' // NOSONAR

const makeEventBus = () => {
  const listeners = {}
  return {
    on: jest.fn((eventName, fn) => { listeners[eventName] = fn }),
    off: jest.fn(),
    emit: (eventName, payload) => listeners[eventName]?.(payload)
  }
}

// ─── useSpatialListItems — initial state ─────────────────────────────────────────

describe('useSpatialListItems — initial state', () => {
  it('returns empty items and multiselectable false before any event', () => {
    const { result } = renderHook(() => useSpatialListItems(makeEventBus()))
    expect(result.current.items).toEqual([])
    expect(result.current.multiselectable).toBe(false)
  })

  it('returns empty items and multiselectable false when eventBus is undefined', () => {
    const { result } = renderHook(() => useSpatialListItems(undefined))
    expect(result.current.items).toEqual([])
    expect(result.current.multiselectable).toBe(false)
  })
})

// ─── useSpatialListItems — event subscription ────────────────────────────────────

describe('useSpatialListItems — event subscription', () => {
  it('subscribes to map:setfeatures on mount', () => {
    const eb = makeEventBus()
    renderHook(() => useSpatialListItems(eb))
    expect(eb.on).toHaveBeenCalledWith(SET_FEATURES, expect.any(Function))
  })

  it('subscribes to map:setfeaturessuppressed on mount', () => {
    const eb = makeEventBus()
    renderHook(() => useSpatialListItems(eb))
    expect(eb.on).toHaveBeenCalledWith(SET_FEATURES_SUPPRESSED, expect.any(Function))
  })

  it('unsubscribes on unmount', () => {
    const eb = makeEventBus()
    const { unmount } = renderHook(() => useSpatialListItems(eb))
    unmount()
    expect(eb.off).toHaveBeenCalledWith(SET_FEATURES, expect.any(Function))
    expect(eb.off).toHaveBeenCalledWith(SET_FEATURES_SUPPRESSED, expect.any(Function))
  })

  it('does not subscribe when eventBus is undefined', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    renderHook(() => useSpatialListItems(undefined))
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

// ─── useSpatialListItems — items updates ─────────────────────────────────────────

describe('useSpatialListItems — items updates', () => {
  it('updates items when map:setfeatures is emitted', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useSpatialListItems(eb))
    const items = [{ id: 'a', label: 'Feature A' }, { id: 'b', label: 'Feature B' }]
    act(() => eb.emit(SET_FEATURES, { items }))
    expect(result.current.items).toEqual(items)
  })

  it('clears items when emitted with an empty array', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useSpatialListItems(eb))
    act(() => eb.emit(SET_FEATURES, { items: [{ id: 'a', label: 'A' }] }))
    act(() => eb.emit(SET_FEATURES, { items: [] }))
    expect(result.current.items).toEqual([])
  })

  it('defaults items to empty array when items key is missing from payload', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useSpatialListItems(eb))
    act(() => eb.emit(SET_FEATURES, {}))
    expect(result.current.items).toEqual([])
  })

  it('defaults items to empty array when the event carries no payload at all', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useSpatialListItems(eb))
    act(() => eb.emit(SET_FEATURES))
    expect(result.current.items).toEqual([])
  })
})

// ─── useSpatialListItems — label updates ─────────────────────────────────────────

describe('useSpatialListItems — label updates', () => {
  it('returns undefined label before any event', () => {
    const { result } = renderHook(() => useSpatialListItems(makeEventBus()))
    expect(result.current.label).toBeUndefined()
  })

  it('returns whatever label the current provider declared', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useSpatialListItems(eb))
    act(() => eb.emit(SET_FEATURES, { items: [], label: 'Shape points' }))
    expect(result.current.label).toBe('Shape points')
  })

  it('updates the label when a later event declares a different one', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useSpatialListItems(eb))
    act(() => eb.emit(SET_FEATURES, { items: [], label: 'Map features' }))
    act(() => eb.emit(SET_FEATURES, { items: [], label: 'Shape points' }))
    expect(result.current.label).toBe('Shape points')
  })
})

// ─── useSpatialListItems — focusable updates ─────────────────────────────────────

describe('useSpatialListItems — focusable updates', () => {
  it('defaults to focusable: true before any event', () => {
    const { result } = renderHook(() => useSpatialListItems(makeEventBus()))
    expect(result.current.focusable).toBe(true)
  })

  it('defaults to focusable: true when the event omits it', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useSpatialListItems(eb))
    act(() => eb.emit(SET_FEATURES, { items: [] }))
    expect(result.current.focusable).toBe(true)
  })

  it('reflects an explicit focusable: false from the current provider', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useSpatialListItems(eb))
    act(() => eb.emit(SET_FEATURES, { items: [], focusable: false }))
    expect(result.current.focusable).toBe(false)
  })

  it('reverts to true once a later event omits it again (e.g. draw released its claim)', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useSpatialListItems(eb))
    act(() => eb.emit(SET_FEATURES, { items: [], focusable: false }))
    act(() => eb.emit(SET_FEATURES, { items: [] }))
    expect(result.current.focusable).toBe(true)
  })
})

// ─── useSpatialListItems — multiselectable updates ───────────────────────────────

describe('useSpatialListItems — multiselectable updates', () => {
  it('sets multiselectable true when emitted with multiselectable: true', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useSpatialListItems(eb))
    act(() => eb.emit(SET_FEATURES, { items: [], multiselectable: true }))
    expect(result.current.multiselectable).toBe(true)
  })

  it('defaults multiselectable to false when not present in payload', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useSpatialListItems(eb))
    act(() => eb.emit(SET_FEATURES, { items: [] }))
    expect(result.current.multiselectable).toBe(false)
  })
})

// ─── useSpatialListItems — suppression ───────────────────────────────────────────

describe('useSpatialListItems — suppression', () => {
  const items = [{ id: 'a', label: 'Feature A' }]

  it('reports empty items while suppressed, regardless of what was last set', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useSpatialListItems(eb))
    act(() => eb.emit(SET_FEATURES, { items }))
    act(() => eb.emit(SET_FEATURES_SUPPRESSED, { suppressed: true }))
    expect(result.current.items).toEqual([])
  })

  it('restores the last known items once suppression is lifted', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useSpatialListItems(eb))
    act(() => eb.emit(SET_FEATURES, { items }))
    act(() => eb.emit(SET_FEATURES_SUPPRESSED, { suppressed: true }))
    act(() => eb.emit(SET_FEATURES_SUPPRESSED, { suppressed: false }))
    expect(result.current.items).toEqual(items)
  })

  it('defaults suppressed to false when the payload omits it', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useSpatialListItems(eb))
    act(() => eb.emit(SET_FEATURES, { items }))
    act(() => eb.emit(SET_FEATURES_SUPPRESSED, {}))
    expect(result.current.items).toEqual(items)
  })

  it('defaults suppressed to false when the event carries no payload at all', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useSpatialListItems(eb))
    act(() => eb.emit(SET_FEATURES, { items }))
    act(() => eb.emit(SET_FEATURES_SUPPRESSED))
    expect(result.current.items).toEqual(items)
  })

  it('a features update received while suppressed is still applied once restored', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useSpatialListItems(eb))
    act(() => eb.emit(SET_FEATURES_SUPPRESSED, { suppressed: true }))
    act(() => eb.emit(SET_FEATURES, { items }))
    expect(result.current.items).toEqual([]) // still suppressed
    act(() => eb.emit(SET_FEATURES_SUPPRESSED, { suppressed: false }))
    expect(result.current.items).toEqual(items)
  })
})
