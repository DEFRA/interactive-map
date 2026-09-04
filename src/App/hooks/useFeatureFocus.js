import { useState, useEffect, useRef } from 'react'
import { EVENTS } from '../../config/events.js'

const getNavigatedId = (id, key, items) => {
  if (!items.length) {
    return id
  }
  if (key === 'Home') {
    return items[0].id
  }
  if (key === 'End') {
    return items[items.length - 1].id
  }
  const idx = items.findIndex(item => item.id === id)
  if (key === 'ArrowDown') {
    return idx === -1 ? items[0].id : items[Math.min(idx + 1, items.length - 1)].id
  }
  return idx === -1 ? items[items.length - 1].id : items[Math.max(idx - 1, 0)].id
}

// ARIA listbox entry priority: first selected → last active (if still in list) → first item
const resolveEntryId = (items, lastActiveId, selectedIds) => {
  const firstSelected = items.find(item => selectedIds.includes(item.id))
  if (firstSelected) {
    return firstSelected.id
  }
  if (lastActiveId && items.some(item => item.id === lastActiveId)) {
    return lastActiveId
  }
  return items[0].id
}

// Roving tabindex: moves real focus to the option matching id, found via data-id (avoids
// CSS-escaping issues a querySelector would have with arbitrary ids). Flags
// isInternalFocusMoveRef around the .focus() call so onFocus/onBlur can ignore this as an
// internal move, not a real widget entry/exit — event.relatedTarget can't be used for that:
// preact/compat (react is aliased to it in this app's build) doesn't populate it on synthetic
// focus/blur events, so it's silently unreliable outside tests (real React + jsdom).
const focusOption = (listboxEl, id, isInternalFocusMoveRef) => {
  const el = Array.from(listboxEl?.children ?? []).find(li => li.dataset.id === String(id))
  if (!el) {
    return
  }
  isInternalFocusMoveRef.current = true
  el.focus({ preventScroll: true })
  isInternalFocusMoveRef.current = false
}

/**
 * Keeps local selectedIds in sync with interact:selectionchange, and mirrors
 * MAP_SET_ACTIVE_FEATURE back into React state so the roving tabindex position stays current.
 */
function useEventBusListeners ({ eventBus, lastActiveIdRef, setActiveFeatureId, setSelectedIds }) {
  useEffect(() => {
    if (!eventBus) {
      return undefined
    }
    const handleSetActive = ({ id }) => {
      if (id !== null) {
        lastActiveIdRef.current = id
      }
      setActiveFeatureId(id)
    }
    const handleSelectionChange = ({ selectedFeatures = [], selectedMarkers = [] }) => {
      setSelectedIds([...selectedFeatures.map(f => String(f.featureId)), ...selectedMarkers])
    }
    eventBus.on(EVENTS.MAP_SET_ACTIVE_FEATURE, handleSetActive)
    eventBus.on('interact:selectionchange', handleSelectionChange)
    return () => {
      eventBus.off(EVENTS.MAP_SET_ACTIVE_FEATURE, handleSetActive)
      eventBus.off('interact:selectionchange', handleSelectionChange)
    }
  }, [eventBus])
}

/**
 * Re-picks the active item (ARIA priority order) when it drops out of the item list while
 * focused — e.g. panned off screen — and moves real focus to it.
 */
function useItemsRevalidation ({ items, eventBus, isFocusedRef, featuresRef, isInternalFocusMoveRef, lastActiveIdRef, activeFeatureIdRef, selectedIdsRef, setActiveFeatureId }) {
  useEffect(() => {
    if (!isFocusedRef.current) {
      return
    }
    if (!items.length) {
      setActiveFeatureId(null)
      eventBus?.emit(EVENTS.MAP_SET_ACTIVE_FEATURE, { id: null })
      return
    }
    if (items.some(item => item.id === activeFeatureIdRef.current)) {
      return
    }
    const nextId = resolveEntryId(items, lastActiveIdRef.current, selectedIdsRef.current)
    lastActiveIdRef.current = nextId
    setActiveFeatureId(nextId)
    eventBus?.emit(EVENTS.MAP_SET_ACTIVE_FEATURE, { id: nextId })
    focusOption(featuresRef.current, nextId, isInternalFocusMoveRef)
  }, [items]) // NOSONAR — eventBus/selectedIds consumed via refs to avoid spurious re-runs on selection change
}

/**
 * Attaches a keydown listener to the listbox element for ARIA keyboard navigation:
 * - ArrowUp/ArrowDown — move the active item, moving real focus to it (roving tabindex)
 * - Home/End — jump the active item to the first/last option
 * - Enter/Space — confirm selection, emitting MAP_SELECT_FEATURE
 * - Escape — return focus to the map viewport
 */
function useKeyboardNavigation ({ featuresRef, viewportRef, items, eventBus, activeFeatureIdRef, lastActiveIdRef, setActiveFeatureId, isInternalFocusMoveRef, hints, currentHintRef }) {
  useEffect(() => {
    const listboxEl = featuresRef.current
    if (!listboxEl) {
      return undefined
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (currentHintRef.current) {
          hints.dismiss()
        } else {
          viewportRef.current?.focus()
        }
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
        event.preventDefault()
        event.stopPropagation()
        const newId = getNavigatedId(activeFeatureIdRef.current, event.key, items)
        lastActiveIdRef.current = newId
        setActiveFeatureId(newId)
        eventBus?.emit(EVENTS.MAP_SET_ACTIVE_FEATURE, { id: newId })
        focusOption(listboxEl, newId, isInternalFocusMoveRef)
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        event.stopPropagation()
        eventBus?.emit(EVENTS.MAP_SELECT_FEATURE)
      } else {
        // No action
      }
    }
    listboxEl.addEventListener('keydown', handleKeyDown)
    return () => { listboxEl.removeEventListener('keydown', handleKeyDown) }
  }, [viewportRef, featuresRef, items, eventBus])
}

/**
 * Returns focus to the viewport when the user interacts with the map via pointer while the
 * listbox is focused — clears its focus ring without dropping focus to nowhere.
 */
function useMapInteractionBlur ({ viewportRef, featuresRef, isFocusedRef }) {
  useEffect(() => {
    const el = viewportRef.current
    if (!el) {
      return undefined
    }
    const handlePointerDown = (event) => {
      if (isFocusedRef.current && !featuresRef.current?.contains(event.target)) {
        viewportRef.current?.focus()
      }
    }
    el.addEventListener('pointerdown', handlePointerDown)
    return () => { el.removeEventListener('pointerdown', handlePointerDown) }
  }, [viewportRef, featuresRef])
}

/**
 * Manages roving-tabindex focus state for the keyboard-accessible feature list. On focus, sets
 * activeFeatureId via ARIA priority order (see resolveEntryId); on blur, clears it. Revalidates
 * when the item list changes (e.g. after a map pan) so it never points to a stale item.
 *
 * @param {{ viewportRef: React.RefObject, featuresRef: React.RefObject, items: Array, eventBus: object }} params
 * @returns {{ activeFeatureId: string|null, tabbableId: string|null, selectedIds: string[], onFocus: Function, onBlur: Function, selectItem: Function }}
 */
export function useFeatureFocus ({ viewportRef, featuresRef, items = [], eventBus, hints }) {
  const [activeFeatureId, setActiveFeatureId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])

  const isFocusedRef = useRef(false)
  const lastActiveIdRef = useRef(null) // preserved across blur; restores position on re-focus
  const activeFeatureIdRef = useRef(null) // always-current for keydown closure
  const selectedIdsRef = useRef([]) // always-current for items-change effect
  const currentHintRef = useRef(null)
  const isInternalFocusMoveRef = useRef(false) // true only while focusOption()'s own .focus() call is in flight

  useEffect(() => {
    return hints.subscribe((hint) => {
      currentHintRef.current = hint
    })
  }, [hints])

  // Always-current mirrors for values read from event-listener closures (not React re-renders) —
  // assigned directly during render, same convention as useVisibleGeometry.js's latestRef.
  activeFeatureIdRef.current = activeFeatureId
  selectedIdsRef.current = selectedIds

  useEventBusListeners({ eventBus, lastActiveIdRef, setActiveFeatureId, setSelectedIds })
  useItemsRevalidation({ items, eventBus, isFocusedRef, featuresRef, isInternalFocusMoveRef, lastActiveIdRef, activeFeatureIdRef, selectedIdsRef, setActiveFeatureId })
  useKeyboardNavigation({ featuresRef, viewportRef, items, eventBus, activeFeatureIdRef, lastActiveIdRef, setActiveFeatureId, isInternalFocusMoveRef, hints, currentHintRef })
  useMapInteractionBlur({ viewportRef, featuresRef, isFocusedRef })

  // Resting roving-tabindex position — where Tab lands before the list has ever had real focus.
  // activeFeatureId takes priority once the list is actually focused. Deliberately never
  // selection-driven (unlike onFocus's own resolution below) — sticks to the last established
  // keyboard position, or the first item if there isn't one yet. "Prefer the selected item" is
  // an onFocus-only concern (a real Tab-in); if it applied here too, any selection change made
  // elsewhere (e.g. clicking a marker on the map, which never touches lastActiveIdRef) would
  // keep relocating tabIndex to follow it, even though nothing about keyboard state changed.
  let tabbableId = null
  if (items.length) {
    const hasEstablishedPosition = lastActiveIdRef.current && items.some(item => item.id === lastActiveIdRef.current)
    tabbableId = hasEstablishedPosition ? lastActiveIdRef.current : items[0].id
  }

  const onFocus = () => {
    isFocusedRef.current = true
    // Ignore focus moving between sibling options (roving tabindex) — the keydown/selectItem
    // path that moved it already resolved and emitted the correct id; re-resolving here would
    // clobber that emit.
    if (isInternalFocusMoveRef.current) {
      return
    }
    if (!items.length) {
      return
    }
    // A real Tab-in always prefers a selected item over the remembered position (native listbox
    // behaviour) — can't reuse tabbableId here, which deliberately does the opposite (sticks to
    // the remembered position, ignoring selection) once one is established.
    const id = resolveEntryId(items, lastActiveIdRef.current, selectedIds)
    lastActiveIdRef.current = id
    setActiveFeatureId(id)
    eventBus?.emit(EVENTS.MAP_SET_ACTIVE_FEATURE, { id })
    // Real focus may have landed on a different option than this resolves to — tabbableId (which
    // decided where Tab lands) can legitimately disagree with resolveEntryId's own priority (e.g.
    // Tab lands on the structural first item, but a different item is selected and takes
    // priority here). Move real focus to match so it never disagrees with activeFeatureId.
    focusOption(featuresRef.current, id, isInternalFocusMoveRef)
  }

  const onBlur = () => {
    // Ignore focus moving between sibling options (roving tabindex) — not a real exit.
    if (isInternalFocusMoveRef.current) {
      return
    }
    isFocusedRef.current = false
    setActiveFeatureId(null)
    eventBus?.emit(EVENTS.MAP_SET_ACTIVE_FEATURE, { id: null })
  }

  // Mirrors keyboard Enter/Space: make the clicked item active, focus it, then confirm selection.
  const selectItem = (id) => {
    lastActiveIdRef.current = id
    setActiveFeatureId(id)
    eventBus?.emit(EVENTS.MAP_SET_ACTIVE_FEATURE, { id })
    focusOption(featuresRef.current, id, isInternalFocusMoveRef)
    eventBus?.emit(EVENTS.MAP_SELECT_FEATURE)
  }

  return { activeFeatureId, tabbableId, selectedIds, onFocus, onBlur, selectItem }
}
