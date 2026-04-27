import { renderHook, act } from '@testing-library/react'
import { useFeatureFocus } from './useFeatureFocus.js'

const ITEMS = [
  { id: 'a', label: 'Feature A' },
  { id: 'b', label: 'Feature B' },
  { id: 'c', label: 'Feature C' }
]

const makeRefs = ({ viewportFocus } = {}) => ({
  viewportRef: { current: { focus: viewportFocus ?? jest.fn() } },
  featuresRef: { current: document.createElement('ul') }
})

const fireKey = (el, key) => {
  act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })) })
}

// ─── useFeatureFocus — initial state ─────────────────────────────────────────

describe('useFeatureFocus — initial state', () => {
  it('activeFeatureId starts as null', () => {
    const { result } = renderHook(() => useFeatureFocus(makeRefs()))
    expect(result.current.activeFeatureId).toBeNull()
  })

  it('exposes onFocus function', () => {
    const { result } = renderHook(() => useFeatureFocus(makeRefs()))
    expect(typeof result.current.onFocus).toBe('function')
  })
})

// ─── useFeatureFocus — onFocus ────────────────────────────────────────────────

describe('useFeatureFocus — onFocus', () => {
  it('sets activeFeatureId to first item when items are present', () => {
    const { result } = renderHook(() => useFeatureFocus({ ...makeRefs(), items: ITEMS }))
    act(() => result.current.onFocus())
    expect(result.current.activeFeatureId).toBe('a')
  })

  it('does nothing when items is empty', () => {
    const { result } = renderHook(() => useFeatureFocus(makeRefs()))
    act(() => result.current.onFocus())
    expect(result.current.activeFeatureId).toBeNull()
  })
})

// ─── useFeatureFocus — keydown listener lifecycle ────────────────────────────

describe('useFeatureFocus — keydown listener lifecycle', () => {
  it('does not attach listener when featuresRef.current is null', () => {
    const refs = { viewportRef: { current: { focus: jest.fn() } }, featuresRef: { current: null } }
    const spy = jest.spyOn(document.body, 'addEventListener')
    renderHook(() => useFeatureFocus(refs))
    expect(spy).not.toHaveBeenCalledWith('keydown', expect.any(Function))
    spy.mockRestore()
  })

  it('attaches and removes keydown listener on the features element', () => {
    const refs = makeRefs()
    const el = refs.featuresRef.current
    const addSpy = jest.spyOn(el, 'addEventListener')
    const removeSpy = jest.spyOn(el, 'removeEventListener')
    const { unmount } = renderHook(() => useFeatureFocus(refs))
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})

// ─── useFeatureFocus — unhandled keys ────────────────────────────────────────

describe('useFeatureFocus — unhandled keys', () => {
  it('does nothing for keys that are not Escape or Arrow', () => {
    const viewportFocus = jest.fn()
    const refs = makeRefs({ viewportFocus })
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    const { result } = renderHook(() => useFeatureFocus({ ...refs, items: ITEMS }))
    fireKey(el, 'Tab')
    expect(result.current.activeFeatureId).toBeNull()
    expect(viewportFocus).not.toHaveBeenCalled()
    el.remove()
  })
})

// ─── useFeatureFocus — Escape key ────────────────────────────────────────────

describe('useFeatureFocus — Escape key', () => {
  it('clears activeFeatureId and focuses viewport', () => {
    const viewportFocus = jest.fn()
    const refs = makeRefs({ viewportFocus })
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    const { result } = renderHook(() => useFeatureFocus({ ...refs, items: ITEMS }))
    act(() => result.current.onFocus())
    fireKey(el, 'Escape')
    expect(result.current.activeFeatureId).toBeNull()
    expect(viewportFocus).toHaveBeenCalled()
    el.remove()
  })

  it('does not throw when viewportRef.current is null', () => {
    const refs = { viewportRef: { current: null }, featuresRef: { current: document.createElement('ul') } }
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    renderHook(() => useFeatureFocus(refs))
    expect(() => fireKey(el, 'Escape')).not.toThrow()
    el.remove()
  })
})

// ─── useFeatureFocus — ArrowDown navigation ───────────────────────────────────

describe('useFeatureFocus — ArrowDown navigation', () => {
  const setup = () => {
    const refs = makeRefs()
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    const { result, unmount } = renderHook(() => useFeatureFocus({ ...refs, items: ITEMS }))
    return { result, el, unmount }
  }

  it('selects first item when no item is active', () => {
    const { result, el, unmount } = setup()
    fireKey(el, 'ArrowDown')
    expect(result.current.activeFeatureId).toBe('a')
    unmount(); el.remove()
  })

  it('advances to next item', () => {
    const { result, el, unmount } = setup()
    act(() => result.current.onFocus())
    fireKey(el, 'ArrowDown')
    expect(result.current.activeFeatureId).toBe('b')
    unmount(); el.remove()
  })

  it('clamps at last item', () => {
    const refs = makeRefs()
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    const { result, unmount } = renderHook(() => useFeatureFocus({ ...refs, items: ITEMS }))
    act(() => result.current.onFocus())
    fireKey(el, 'ArrowDown')
    fireKey(el, 'ArrowDown')
    fireKey(el, 'ArrowDown')
    expect(result.current.activeFeatureId).toBe('c')
    unmount(); el.remove()
  })

  it('does nothing when items is empty', () => {
    const refs = makeRefs()
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    const { result, unmount } = renderHook(() => useFeatureFocus(refs))
    fireKey(el, 'ArrowDown')
    expect(result.current.activeFeatureId).toBeNull()
    unmount(); el.remove()
  })
})

// ─── useFeatureFocus — ArrowUp navigation ────────────────────────────────────

describe('useFeatureFocus — ArrowUp navigation', () => {
  it('selects last item when no item is active', () => {
    const refs = makeRefs()
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    const { result, unmount } = renderHook(() => useFeatureFocus({ ...refs, items: ITEMS }))
    fireKey(el, 'ArrowUp')
    expect(result.current.activeFeatureId).toBe('c')
    unmount(); el.remove()
  })

  it('moves to previous item', () => {
    const refs = makeRefs()
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    const { result, unmount } = renderHook(() => useFeatureFocus({ ...refs, items: ITEMS }))
    act(() => result.current.onFocus())
    fireKey(el, 'ArrowDown')
    fireKey(el, 'ArrowUp')
    expect(result.current.activeFeatureId).toBe('a')
    unmount(); el.remove()
  })

  it('clamps at first item', () => {
    const refs = makeRefs()
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    const { result, unmount } = renderHook(() => useFeatureFocus({ ...refs, items: ITEMS }))
    act(() => result.current.onFocus())
    fireKey(el, 'ArrowUp')
    fireKey(el, 'ArrowUp')
    expect(result.current.activeFeatureId).toBe('a')
    unmount(); el.remove()
  })
})
