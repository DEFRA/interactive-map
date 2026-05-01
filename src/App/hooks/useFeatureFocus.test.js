import { renderHook, act } from '@testing-library/react'
import { useFeatureFocus } from './useFeatureFocus.js'

const ITEMS = [
  { id: 'a', label: 'Feature A' },
  { id: 'b', label: 'Feature B' },
  { id: 'c', label: 'Feature C' }
]

const SET_ACTIVE = 'map:setactivefeature' // NOSONAR
const SELECT = 'map:selectfeature'
const SELECTION_CHANGE = 'interact:selectionchange'

const makeEventBus = () => {
  const listeners = {}
  return {
    on: jest.fn((e, fn) => { listeners[e] = fn }),
    off: jest.fn(),
    emit: jest.fn(),
    trigger: (e, payload) => listeners[e]?.(payload)
  }
}

const makeRefs = ({ viewportFocus } = {}) => {
  const viewportEl = document.createElement('div')
  viewportEl.focus = viewportFocus ?? jest.fn()
  return {
    viewportRef: { current: viewportEl },
    featuresRef: { current: document.createElement('ul') },
    hintManager: { subscribe: jest.fn(() => jest.fn()), dismiss: jest.fn() }
  }
}

const fireKey = (el, key) => {
  let event
  act(() => {
    event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    el.dispatchEvent(event)
  })
  return event
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

  it('exposes onBlur function', () => {
    const { result } = renderHook(() => useFeatureFocus(makeRefs()))
    expect(typeof result.current.onBlur).toBe('function')
  })
})

// ─── useFeatureFocus — onFocus ────────────────────────────────────────────────

describe('useFeatureFocus — onFocus', () => {
  it('sets activeFeatureId to first item on first focus (no previous, no selected)', () => {
    const { result } = renderHook(() => useFeatureFocus({ ...makeRefs(), items: ITEMS }))
    act(() => result.current.onFocus())
    expect(result.current.activeFeatureId).toBe('a')
  })

  it('does nothing when items is empty', () => {
    const { result } = renderHook(() => useFeatureFocus(makeRefs()))
    act(() => result.current.onFocus())
    expect(result.current.activeFeatureId).toBeNull()
  })

  it('sets active to first selected item (highest priority)', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureFocus({ ...makeRefs(), items: ITEMS, eventBus: eb }))
    act(() => eb.trigger(SELECTION_CHANGE, { selectedFeatures: [{ featureId: 'b', layerId: 'roads' }] }))
    act(() => result.current.onFocus())
    expect(result.current.activeFeatureId).toBe('b')
  })

  it('selected item takes priority over last active position', () => {
    const eb = makeEventBus()
    const refs = makeRefs()
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    const { result, unmount } = renderHook(() => useFeatureFocus({ ...refs, items: ITEMS, eventBus: eb }))
    act(() => result.current.onFocus())
    fireKey(el, 'ArrowDown') // last active = 'b'
    act(() => result.current.onBlur())
    act(() => eb.trigger(SELECTION_CHANGE, { selectedFeatures: [{ featureId: 'c', layerId: 'roads' }] }))
    act(() => result.current.onFocus())
    expect(result.current.activeFeatureId).toBe('c') // selected beats last-active
    unmount(); el.remove()
  })

  it('restores last active position when nothing is selected', () => {
    const refs = makeRefs()
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    const { result, unmount } = renderHook(() => useFeatureFocus({ ...refs, items: ITEMS }))
    act(() => result.current.onFocus())
    fireKey(el, 'ArrowDown') // last active = 'b'
    act(() => result.current.onBlur())
    act(() => result.current.onFocus())
    expect(result.current.activeFeatureId).toBe('b')
    unmount(); el.remove()
  })

  it('falls back to first item when previous active is no longer in the list', () => {
    const eb = makeEventBus()
    const refs = makeRefs()
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    const { result, rerender, unmount } = renderHook(
      ({ items }) => useFeatureFocus({ ...refs, items, eventBus: eb }),
      { initialProps: { items: ITEMS } }
    )
    act(() => result.current.onFocus())
    fireKey(el, 'ArrowDown') // active = 'b'
    act(() => result.current.onBlur())
    const NEW_ITEMS = [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }]
    rerender({ items: NEW_ITEMS })
    act(() => result.current.onFocus())
    expect(result.current.activeFeatureId).toBe('x')
    unmount(); el.remove()
  })
})

// ─── useFeatureFocus — onBlur ─────────────────────────────────────────────────

describe('useFeatureFocus — onBlur', () => {
  it('clears activeFeatureId when focus leaves the listbox', () => {
    const { result } = renderHook(() => useFeatureFocus({ ...makeRefs(), items: ITEMS }))
    act(() => result.current.onFocus())
    expect(result.current.activeFeatureId).toBe('a')
    act(() => result.current.onBlur())
    expect(result.current.activeFeatureId).toBeNull()
  })

  it('emits map:setactivefeature with null on blur', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureFocus({ ...makeRefs(), items: ITEMS, eventBus: eb }))
    act(() => result.current.onFocus())
    eb.emit.mockClear()
    act(() => result.current.onBlur())
    expect(eb.emit).toHaveBeenCalledWith(SET_ACTIVE, { id: null })
  })

  it('does not throw when eventBus is not provided', () => {
    const { result } = renderHook(() => useFeatureFocus({ ...makeRefs(), items: ITEMS }))
    expect(() => act(() => result.current.onBlur())).not.toThrow()
  })
})

// ─── useFeatureFocus — keydown listener lifecycle ────────────────────────────

describe('useFeatureFocus — keydown listener lifecycle', () => {
  it('does not attach listener when featuresRef.current is null', () => {
    const refs = makeRefs()
    refs.featuresRef = { current: null }
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
  it('dismisses hint on Escape when hint is visible', () => {
    const refs = makeRefs()
    refs.hintManager.subscribe.mockImplementation((fn) => {
      fn({ html: 'test' })
      return jest.fn()
    })
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    const { result } = renderHook(() => useFeatureFocus({ ...refs, items: ITEMS }))
    act(() => result.current.onFocus())
    fireKey(el, 'Escape')
    expect(refs.hintManager.dismiss).toHaveBeenCalled()
    expect(refs.viewportRef.current.focus).not.toHaveBeenCalled()
    el.remove()
  })

  it('focuses the viewport on Escape when no hint is visible', () => {
    const viewportFocus = jest.fn()
    const refs = makeRefs({ viewportFocus })
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    const { result } = renderHook(() => useFeatureFocus({ ...refs, items: ITEMS }))
    act(() => result.current.onFocus())
    fireKey(el, 'Escape')
    expect(refs.hintManager.dismiss).not.toHaveBeenCalled()
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

  it('stops propagation on Escape so the viewport keyboard handler does not also handle it', () => {
    const refs = makeRefs()
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    renderHook(() => useFeatureFocus({ ...refs, items: ITEMS }))
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    const stopSpy = jest.spyOn(event, 'stopPropagation')
    act(() => el.dispatchEvent(event))
    expect(stopSpy).toHaveBeenCalled()
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

  it('stops propagation on ArrowDown so the viewport keyboard handler does not pan the map', () => {
    const { result, el, unmount } = setup()
    act(() => result.current.onFocus())
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    const stopSpy = jest.spyOn(event, 'stopPropagation')
    act(() => el.dispatchEvent(event))
    expect(stopSpy).toHaveBeenCalled()
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

// ─── useFeatureFocus — eventBus integration ───────────────────────────────────

describe('useFeatureFocus — eventBus: map:setactivefeature listener', () => {
  it('subscribes to map:setactivefeature on mount and unsubscribes on unmount', () => {
    const eb = makeEventBus()
    const { unmount } = renderHook(() => useFeatureFocus({ ...makeRefs(), eventBus: eb }))
    expect(eb.on).toHaveBeenCalledWith(SET_ACTIVE, expect.any(Function))
    unmount()
    expect(eb.off).toHaveBeenCalledWith(SET_ACTIVE, expect.any(Function))
  })

  it('updates activeFeatureId when map:setactivefeature is received', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureFocus({ ...makeRefs(), eventBus: eb }))
    act(() => eb.trigger(SET_ACTIVE, { id: 'a' }))
    expect(result.current.activeFeatureId).toBe('a')
  })

  it('clears activeFeatureId when map:setactivefeature is received with null', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureFocus({ ...makeRefs(), items: ITEMS, eventBus: eb }))
    act(() => eb.trigger(SET_ACTIVE, { id: 'a' }))
    act(() => eb.trigger(SET_ACTIVE, { id: null }))
    expect(result.current.activeFeatureId).toBeNull()
  })
})

const setupWithBus = () => {
  const eb = makeEventBus()
  const refs = makeRefs()
  const el = refs.featuresRef.current
  document.body.appendChild(el)
  const { result, unmount } = renderHook(() => useFeatureFocus({ ...refs, items: ITEMS, eventBus: eb }))
  return { eb, el, result, unmount }
}

describe('useFeatureFocus — eventBus: map:setactivefeature emit', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('emits map:setactivefeature with first item id on onFocus', () => {
    const { eb, result } = setupWithBus()
    act(() => result.current.onFocus())
    expect(eb.emit).toHaveBeenCalledWith(SET_ACTIVE, { id: 'a' })
  })

  it('emits map:setactivefeature with new id on ArrowDown', () => {
    const { eb, result, el, unmount } = setupWithBus()
    act(() => result.current.onFocus())
    eb.emit.mockClear()
    fireKey(el, 'ArrowDown')
    expect(eb.emit).toHaveBeenCalledWith(SET_ACTIVE, { id: 'b' })
    unmount()
  })

  it('does not emit when eventBus is not provided', () => {
    const refs = makeRefs()
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    const { result, unmount } = renderHook(() => useFeatureFocus({ ...refs, items: ITEMS }))
    expect(() => {
      act(() => result.current.onFocus())
      fireKey(el, 'ArrowDown')
    }).not.toThrow()
    unmount()
  })
})

// ─── useFeatureFocus — interact:selectionchange listener ─────────────────────

describe('useFeatureFocus — interact:selectionchange listener', () => {
  it('subscribes to interact:selectionchange on mount and unsubscribes on unmount', () => {
    const eb = makeEventBus()
    const { unmount } = renderHook(() => useFeatureFocus({ ...makeRefs(), eventBus: eb }))
    expect(eb.on).toHaveBeenCalledWith(SELECTION_CHANGE, expect.any(Function))
    unmount()
    expect(eb.off).toHaveBeenCalledWith(SELECTION_CHANGE, expect.any(Function))
  })

  it('sets selectedIds from selected features', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureFocus({ ...makeRefs(), eventBus: eb }))
    act(() => eb.trigger(SELECTION_CHANGE, { selectedFeatures: [{ featureId: 27665979, layerId: 'hedges' }] }))
    expect(result.current.selectedIds).toEqual(['27665979'])
  })

  it('sets selectedIds from multiple selected features', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureFocus({ ...makeRefs(), eventBus: eb }))
    act(() => eb.trigger(SELECTION_CHANGE, { selectedFeatures: [{ featureId: 'f1', layerId: 'roads' }, { featureId: 'f2', layerId: 'roads' }] }))
    expect(result.current.selectedIds).toEqual(['f1', 'f2'])
  })

  it('sets selectedIds from selected markers', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureFocus({ ...makeRefs(), eventBus: eb }))
    act(() => eb.trigger(SELECTION_CHANGE, { selectedMarkers: ['m1', 'm2'] }))
    expect(result.current.selectedIds).toEqual(['m1', 'm2'])
  })

  it('sets selectedIds from both features and markers when both are selected', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureFocus({ ...makeRefs(), eventBus: eb }))
    act(() => eb.trigger(SELECTION_CHANGE, { selectedFeatures: [{ featureId: 'f1', layerId: 'roads' }], selectedMarkers: ['m1'] }))
    expect(result.current.selectedIds).toEqual(['f1', 'm1'])
  })

  it('clears selectedIds when selection becomes empty', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureFocus({ ...makeRefs(), eventBus: eb }))
    act(() => eb.trigger(SELECTION_CHANGE, { selectedFeatures: [{ featureId: 'f1', layerId: 'roads' }] }))
    act(() => eb.trigger(SELECTION_CHANGE, { selectedFeatures: [], selectedMarkers: [] }))
    expect(result.current.selectedIds).toEqual([])
  })

  it('does not move activeFeatureId when selectionchange fires (cursor is keyboard-only)', () => {
    const eb = makeEventBus()
    const { result } = renderHook(() => useFeatureFocus({ ...makeRefs(), items: ITEMS, eventBus: eb }))
    act(() => eb.trigger(SELECTION_CHANGE, { selectedFeatures: [{ featureId: 'a', layerId: 'roads' }] }))
    expect(result.current.activeFeatureId).toBeNull()
  })
})

// ─── useFeatureFocus — map interaction returns focus to viewport ──────────────

describe('useFeatureFocus — map pointerdown returns focus to viewport', () => {
  const pointerDown = (target) => act(() => {
    target.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }))
  })

  it('focuses the viewport when pointer lands on the map while listbox is focused', () => {
    const viewportFocus = jest.fn()
    const refs = makeRefs({ viewportFocus })
    document.body.appendChild(refs.viewportRef.current)
    const mapCanvas = document.createElement('canvas')
    refs.viewportRef.current.appendChild(mapCanvas)
    const { result, unmount } = renderHook(() => useFeatureFocus({ ...refs, items: ITEMS }))
    act(() => result.current.onFocus())
    viewportFocus.mockClear()
    pointerDown(mapCanvas)
    expect(viewportFocus).toHaveBeenCalled()
    unmount()
  })

  it('does not move focus when pointer lands inside the listbox', () => {
    const viewportFocus = jest.fn()
    const refs = makeRefs({ viewportFocus })
    document.body.appendChild(refs.viewportRef.current)
    refs.viewportRef.current.appendChild(refs.featuresRef.current)
    const option = document.createElement('li')
    refs.featuresRef.current.appendChild(option)
    const { result, unmount } = renderHook(() => useFeatureFocus({ ...refs, items: ITEMS }))
    act(() => result.current.onFocus())
    viewportFocus.mockClear()
    pointerDown(option)
    expect(viewportFocus).not.toHaveBeenCalled()
    unmount()
  })

  it('does not move focus when pointer fires while listbox is not focused', () => {
    const viewportFocus = jest.fn()
    const refs = makeRefs({ viewportFocus })
    document.body.appendChild(refs.viewportRef.current)
    const mapCanvas = document.createElement('canvas')
    refs.viewportRef.current.appendChild(mapCanvas)
    const { unmount } = renderHook(() => useFeatureFocus({ ...refs, items: ITEMS }))
    pointerDown(mapCanvas)
    expect(viewportFocus).not.toHaveBeenCalled()
    unmount()
  })

  afterEach(() => { document.body.innerHTML = '' })
})

// ─── useFeatureFocus — Enter and Space keys ───────────────────────────────────

describe('useFeatureFocus — Enter and Space keys', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('emits map:selectfeature on Enter', () => {
    const { eb, result, el, unmount } = setupWithBus()
    act(() => result.current.onFocus())
    eb.emit.mockClear()
    fireKey(el, 'Enter')
    expect(eb.emit).toHaveBeenCalledWith(SELECT)
    unmount()
  })

  it('emits map:selectfeature on Space', () => {
    const { eb, result, el, unmount } = setupWithBus()
    act(() => result.current.onFocus())
    eb.emit.mockClear()
    fireKey(el, ' ')
    expect(eb.emit).toHaveBeenCalledWith(SELECT)
    unmount()
  })

  it('stops propagation on Enter', () => {
    const { el, result, unmount } = setupWithBus()
    act(() => result.current.onFocus())
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    const stopSpy = jest.spyOn(event, 'stopPropagation')
    act(() => el.dispatchEvent(event))
    expect(stopSpy).toHaveBeenCalled()
    unmount()
  })

  it('stops propagation on Space', () => {
    const { el, result, unmount } = setupWithBus()
    act(() => result.current.onFocus())
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    const stopSpy = jest.spyOn(event, 'stopPropagation')
    act(() => el.dispatchEvent(event))
    expect(stopSpy).toHaveBeenCalled()
    unmount()
  })
})

// ─── useFeatureFocus — items change while focused ─────────────────────────────

describe('useFeatureFocus — items change while focused', () => {
  afterEach(() => { document.body.innerHTML = '' })

  const setupRerender = (initialItems) => {
    const eb = makeEventBus()
    const refs = makeRefs()
    document.body.appendChild(refs.featuresRef.current)
    const { result, rerender, unmount } = renderHook(
      ({ items }) => useFeatureFocus({ ...refs, items, eventBus: eb }),
      { initialProps: { items: initialItems } }
    )
    return { eb, result, rerender, unmount }
  }

  it('keeps current active item when it is still in the updated list', () => {
    const { result, rerender, unmount } = setupRerender(ITEMS)
    act(() => result.current.onFocus()) // active = 'a'
    act(() => { rerender({ items: [{ id: 'a', label: 'A updated' }, { id: 'd', label: 'D' }] }) })
    expect(result.current.activeFeatureId).toBe('a')
    unmount()
  })

  it('re-picks by priority when current active item leaves the list — first selected wins', () => {
    const { eb, result, rerender, unmount } = setupRerender(ITEMS)
    act(() => eb.trigger(SELECTION_CHANGE, { selectedFeatures: [{ featureId: 'c', layerId: 'l' }] }))
    act(() => result.current.onFocus()) // active = 'a' (first, no prev)
    act(() => { rerender({ items: [{ id: 'c', label: 'C' }, { id: 'd', label: 'D' }] }) }) // 'a' gone
    expect(result.current.activeFeatureId).toBe('c') // first selected
    unmount()
  })

  it('re-picks first item when active leaves and no selected item is in the new list', () => {
    const { result, rerender, unmount } = setupRerender(ITEMS)
    act(() => result.current.onFocus()) // active = 'a'
    act(() => { rerender({ items: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }] }) })
    expect(result.current.activeFeatureId).toBe('x')
    unmount()
  })

  it('does not change active item when the listbox is not focused', () => {
    const { result, rerender, unmount } = setupRerender(ITEMS)
    // never called onFocus — isFocusedRef stays false
    act(() => { rerender({ items: [{ id: 'x', label: 'X' }] }) })
    expect(result.current.activeFeatureId).toBeNull()
    unmount()
  })

  it('emits map:setactivefeature with new id when re-pick occurs', () => {
    const { eb, result, rerender, unmount } = setupRerender(ITEMS)
    act(() => result.current.onFocus())
    eb.emit.mockClear()
    act(() => { rerender({ items: [{ id: 'x', label: 'X' }] }) }) // 'a' gone
    expect(eb.emit).toHaveBeenCalledWith('map:setactivefeature', { id: 'x' })
    unmount()
  })

  it('clears active and emits null when items list becomes empty while focused', () => {
    const { eb, result, rerender, unmount } = setupRerender(ITEMS)
    act(() => result.current.onFocus())
    eb.emit.mockClear()
    act(() => { rerender({ items: [] }) })
    expect(result.current.activeFeatureId).toBeNull()
    expect(eb.emit).toHaveBeenCalledWith('map:setactivefeature', { id: null })
    unmount()
  })
})
