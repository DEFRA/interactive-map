import React, { useRef } from 'react'
import { render, fireEvent, act } from '@testing-library/react'
import { Features } from './Features.jsx'
import { useFeatureFocus } from '../../hooks/useFeatureFocus.js'
import { useConfig } from '../../store/configContext.js'

jest.mock('../../store/configContext.js', () => ({ useConfig: jest.fn() }))

const APP_ID = 'test-app'
const LISTBOX = '[role="listbox"]' // NOSONAR
const OPTION = '[role="option"]' // NOSONAR
const ARIA_SELECTED = 'aria-selected'
const ITEMS = [
  { id: 'f1', label: 'Feature One' },
  { id: 'f2', label: 'Feature Two' }
]

beforeEach(() => {
  useConfig.mockReturnValue({ id: APP_ID })
})

// ─── Features — rendering ─────────────────────────────────────────────────────

describe('Features — rendering', () => {
  it('renders a listbox with the correct id', () => {
    const { container } = render(<Features />)
    expect(container.querySelector(`#${APP_ID}-features`)).toBeTruthy()
    expect(container.querySelector(LISTBOX)).toBeTruthy() // NOSONAR
  })

  it('renders no options when items is empty', () => {
    const { container } = render(<Features />)
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(0) // NOSONAR
  })

  it('renders one option per item with correct id, data-id and label', () => {
    const { container } = render(<Features items={ITEMS} />)
    const options = container.querySelectorAll(OPTION)
    expect(options).toHaveLength(2)
    expect(options[0].getAttribute('id')).toBe(`${APP_ID}-feature-f1`)
    expect(options[0].dataset.id).toBe('f1')
    expect(options[0].textContent).toBe('Feature One')
    expect(options[1].getAttribute('id')).toBe(`${APP_ID}-feature-f2`)
    expect(options[1].dataset.id).toBe('f2')
    expect(options[1].textContent).toBe('Feature Two')
  })

  it('sets aria-selected on items present in selectedIds', () => {
    const { container } = render(<Features items={ITEMS} selectedIds={['f1']} />)
    const options = container.querySelectorAll(OPTION)
    expect(options[0]).toHaveAttribute(ARIA_SELECTED, 'true')
    expect(options[1]).toHaveAttribute(ARIA_SELECTED, 'false')
  })

  it('sets aria-selected on multiple items when selectedIds has multiple entries', () => {
    const { container } = render(<Features items={ITEMS} selectedIds={['f1', 'f2']} />)
    const options = container.querySelectorAll(OPTION)
    expect(options[0]).toHaveAttribute(ARIA_SELECTED, 'true')
    expect(options[1]).toHaveAttribute(ARIA_SELECTED, 'true')
  })

  it('does not set aria-selected from activeFeatureId alone', () => {
    const { container } = render(<Features items={ITEMS} activeFeatureId='f1' />)
    const options = container.querySelectorAll(OPTION)
    expect(options[0]).toHaveAttribute(ARIA_SELECTED, 'false')
    expect(options[1]).toHaveAttribute(ARIA_SELECTED, 'false')
  })

  it('gives the active item tabIndex 0 and every other item tabIndex -1 (roving tabindex)', () => {
    const { container } = render(<Features items={ITEMS} activeFeatureId='f2' />)
    const options = container.querySelectorAll(OPTION)
    expect(options[0].getAttribute('tabIndex')).toBe('-1')
    expect(options[1].getAttribute('tabIndex')).toBe('0')
  })

  it('falls back to tabbableId for roving tabindex when activeFeatureId is absent', () => {
    const { container } = render(<Features items={ITEMS} tabbableId='f1' />)
    const options = container.querySelectorAll(OPTION)
    expect(options[0].getAttribute('tabIndex')).toBe('0')
    expect(options[1].getAttribute('tabIndex')).toBe('-1')
  })

  it('sets aria-multiselectable when multiselectable is true', () => {
    const { container } = render(<Features items={ITEMS} multiselectable />)
    expect(container.querySelector(LISTBOX).getAttribute('aria-multiselectable')).toBe('true') // NOSONAR
  })

  it('omits aria-multiselectable when multiselectable is false', () => {
    const { container } = render(<Features items={ITEMS} />)
    expect(container.querySelector(LISTBOX).getAttribute('aria-multiselectable')).toBeNull() // NOSONAR
  })

  it('is not aria-hidden when items are present', () => {
    const { container } = render(<Features items={ITEMS} />)
    const ul = container.querySelector(LISTBOX) // NOSONAR
    expect(ul.getAttribute('aria-hidden')).toBeNull()
  })

  it('is aria-hidden and has no options when items is empty', () => {
    const { container } = render(<Features />)
    const ul = container.querySelector(LISTBOX) // NOSONAR
    expect(ul.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelectorAll(OPTION)).toHaveLength(0) // NOSONAR
  })

  it('sets aria-describedby to the shared hints container id', () => {
    const { container } = render(<Features />)
    expect(container.querySelector(LISTBOX).getAttribute('aria-describedby')).toBe(`${APP_ID}-keyboard-desc`) // NOSONAR
  })
})

// ─── Features — interactions ──────────────────────────────────────────────────

describe('Features — interactions', () => {
  it('calls onFocus when the listbox receives focus', () => {
    const onFocus = jest.fn()
    const { container } = render(<Features onFocus={onFocus} />)
    fireEvent.focus(container.querySelector(LISTBOX)) // NOSONAR
    expect(onFocus).toHaveBeenCalled()
  })

  it('calls onBlur when the listbox loses focus', () => {
    const onBlur = jest.fn()
    const { container } = render(<Features onBlur={onBlur} />)
    fireEvent.blur(container.querySelector(LISTBOX)) // NOSONAR
    expect(onBlur).toHaveBeenCalled()
  })

  it('calls onSelectItem with the clicked item id', () => {
    const onSelectItem = jest.fn()
    const { container } = render(<Features items={ITEMS} onSelectItem={onSelectItem} />)
    fireEvent.click(container.querySelectorAll(OPTION)[1]) // NOSONAR
    expect(onSelectItem).toHaveBeenCalledWith('f2')
  })

  it('does not throw on click when onSelectItem is not provided', () => {
    const { container } = render(<Features items={ITEMS} />)
    expect(() => fireEvent.click(container.querySelectorAll(OPTION)[0])).not.toThrow() // NOSONAR
  })
})

// ─── Features + useFeatureFocus — roving tabindex wired together for real ────
//
// The tests above exercise Features in isolation (mocked onFocus/onBlur), and
// useFeatureFocus.test.js exercises the hook in isolation (onFocus/onBlur called
// directly, not via real DOM events). Neither can catch a bug where moving real focus
// between sibling options — which roving tabindex does on every arrow key — fires a
// genuine native focusin that bubbles up and re-triggers React's onFocus on the <ul>.
// Only rendering both together with real (unmocked) focus exercises that bubbling path.

const RovingHarness = ({ eventBus }) => {
  const viewportRef = useRef(document.createElement('div'))
  const featuresRef = useRef(null)
  const { activeFeatureId, tabbableId, selectedIds, onFocus, onBlur, selectItem } = useFeatureFocus({
    viewportRef, featuresRef, items: ITEMS, eventBus, hints: { subscribe: () => () => {}, dismiss: () => {} }
  })
  return (
    <Features
      ref={featuresRef} activeFeatureId={activeFeatureId} tabbableId={tabbableId} selectedIds={selectedIds}
      items={ITEMS} onFocus={onFocus} onBlur={onBlur} onSelectItem={selectItem}
    />
  )
}

describe('Features + useFeatureFocus — roving tabindex real focus events', () => {
  it('emits map:setactivefeature exactly once when arrowing to the next option', () => {
    const eb = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
    const { container } = render(<RovingHarness eventBus={eb} />)
    act(() => container.querySelector('[data-id="f1"]').focus())
    eb.emit.mockClear()
    fireEvent.keyDown(container.querySelector(LISTBOX), { key: 'ArrowDown' }) // NOSONAR
    expect(eb.emit).toHaveBeenCalledTimes(1)
    expect(eb.emit).toHaveBeenCalledWith('map:setactivefeature', { id: 'f2' })
  })

  it('moves real DOM focus to the next option on ArrowDown', () => {
    const eb = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
    const { container } = render(<RovingHarness eventBus={eb} />)
    act(() => container.querySelector('[data-id="f1"]').focus())
    fireEvent.keyDown(container.querySelector(LISTBOX), { key: 'ArrowDown' }) // NOSONAR
    expect(document.activeElement.dataset.id).toBe('f2')
  })

  // A real pub/sub bus, with a minimal fake "interact plugin" listening on it — mirroring what
  // useMapItemList.js actually does: track the last map:setactivefeature id, and on
  // map:selectfeature, mark THAT id selected and fire interact:selectionchange back. This is
  // the closest reproduction of the real reported bug: Enter only ever selecting the first item
  // because every arrow move was clobbering the active id back to a stale value.
  const makeFakeInteractBus = () => {
    const listeners = {}
    let lastActiveId = null
    const bus = {
      on: (event, fn) => { (listeners[event] ??= []).push(fn) },
      off: (event, fn) => { listeners[event] = (listeners[event] ?? []).filter(f => f !== fn) },
      emit: (event, payload) => { (listeners[event] ?? []).forEach(fn => fn(payload)) }
    }
    bus.on('map:setactivefeature', ({ id }) => { lastActiveId = id })
    bus.on('map:selectfeature', () => {
      bus.emit('interact:selectionchange', { selectedMarkers: lastActiveId ? [lastActiveId] : [] })
    })
    return bus
  }

  it('selects the item that is actually focused, not the first item, after navigating and pressing Enter', () => {
    const eb = makeFakeInteractBus()
    const { container } = render(<RovingHarness eventBus={eb} />)
    act(() => container.querySelector('[data-id="f1"]').focus())
    const listbox = container.querySelector(LISTBOX)
    fireEvent.keyDown(listbox, { key: 'ArrowDown' }) // NOSONAR — moves to f2
    fireEvent.keyDown(listbox, { key: 'Enter' })
    const options = container.querySelectorAll(OPTION)
    expect(options[0]).toHaveAttribute(ARIA_SELECTED, 'false') // f1 — must not be the one selected
    expect(options[1]).toHaveAttribute(ARIA_SELECTED, 'true') // f2 — the one actually focused
  })

  it('keeps navigating correctly after a selection (does not get stuck reverting to the first item)', () => {
    const eb = makeFakeInteractBus()
    const { container } = render(<RovingHarness eventBus={eb} />)
    act(() => container.querySelector('[data-id="f1"]').focus())
    const listbox = container.querySelector(LISTBOX)
    fireEvent.keyDown(listbox, { key: 'ArrowDown' }) // NOSONAR — f1 -> f2
    fireEvent.keyDown(listbox, { key: 'Enter' }) // select f2
    fireEvent.keyDown(listbox, { key: 'ArrowUp' }) // f2 -> f1
    expect(document.activeElement.dataset.id).toBe('f1')
    expect(container.querySelectorAll(OPTION)[0].tabIndex).toBe(0)
  })

  it('selecting a marker on the map does not move the roving tabindex position — only aria-selected changes', () => {
    const eb = makeFakeInteractBus()
    const { container } = render(<RovingHarness eventBus={eb} />)
    // Simulates repeatedly clicking a single marker on the map — never touches the list at all.
    act(() => { eb.emit('interact:selectionchange', { selectedMarkers: ['f1'] }) })
    act(() => { eb.emit('interact:selectionchange', { selectedMarkers: ['f2'] }) })
    const options = container.querySelectorAll(OPTION)
    expect(options[0].tabIndex).toBe(0) // f1 — the structural first item, unmoved
    expect(options[1].tabIndex).toBe(-1)
    expect(options[0]).toHaveAttribute(ARIA_SELECTED, 'false')
    expect(options[1]).toHaveAttribute(ARIA_SELECTED, 'true') // only this changed
  })

  it('moves real focus to match the selected item when Tab lands somewhere else', () => {
    const eb = makeFakeInteractBus()
    const { container } = render(<RovingHarness eventBus={eb} />)
    // f2 selected via a map click before any keyboard interaction — tabbableId stays on the
    // structural first item (f1), so Tab lands there first.
    act(() => { eb.emit('interact:selectionchange', { selectedMarkers: ['f2'] }) })
    expect(container.querySelectorAll(OPTION)[0].tabIndex).toBe(0) // Tab will land on f1
    act(() => container.querySelector('[data-id="f1"]').focus()) // simulates the Tab press
    // onFocus resolves to the selected item (f2) and must move real focus there to match —
    // otherwise the list's own focus/announcement would disagree with what the map highlights.
    expect(document.activeElement.dataset.id).toBe('f2')
  })
})
