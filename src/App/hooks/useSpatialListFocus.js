import { useState, useEffect, useRef } from 'react'
import { EVENTS } from '../../config/events.js'
import { findNearestItemInDirection } from '../../utils/findNearestItemInDirection.js'
import { spatialNavigate } from '../../utils/spatialNavigate.js'
import { stopIfGlobalAltKey } from '../../utils/globalAltShortcuts.js'

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

// Whichever item is nearest the map's own center point on screen — the entry-point fallback
// below prefers this over the structurally-first item.
const findNearestToCenter = (items, centerScreenPoint) => {
  if (!centerScreenPoint) {
    return null
  }
  const positioned = items.filter(item => item.x != null && item.y != null)
  if (!positioned.length) {
    return null
  }
  const pixels = positioned.map(item => [item.x, item.y])
  const idx = spatialNavigate([centerScreenPoint.x, centerScreenPoint.y], pixels, undefined)
  return positioned[idx].id
}

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

// ARIA listbox entry priority: first selected → last active (if still in list) → nearest the
// map center → first item (last resort, e.g. no items carry a screen position at all)
const resolveEntryId = (items, lastActiveId, selectedIds, centerScreenPoint) => {
  const firstSelected = items.find(item => selectedIds.includes(item.id))
  if (firstSelected) {
    return firstSelected.id
  }
  if (lastActiveId && items.some(item => item.id === lastActiveId)) {
    return lastActiveId
  }
  return findNearestToCenter(items, centerScreenPoint) ?? items[0].id
}

// Roving tabindex: moves real focus to the option matching id (via data-id, avoiding
// querySelector's CSS-escaping issues with arbitrary ids). Flags isInternalFocusMoveRef around
// the .focus() call so onFocus/onBlur can tell this apart from a real widget entry/exit.
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
 * MAP_SET_ACTIVE_ITEM back into React state so the roving tabindex position stays current.
 */
function useEventBusListeners ({ eventBus, lastActiveIdRef, setActiveItemId, setSelectedIds }) {
  useEffect(() => {
    if (!eventBus) {
      return undefined
    }
    const handleSetActive = ({ id }) => {
      if (id !== null) {
        lastActiveIdRef.current = id
      }
      setActiveItemId(id)
    }
    const handleSelectionChange = ({ selectedFeatures = [], selectedMarkers = [] }) => {
      setSelectedIds([...selectedFeatures.map(f => String(f.featureId)), ...selectedMarkers])
    }
    eventBus.on(EVENTS.MAP_SET_ACTIVE_ITEM, handleSetActive)
    eventBus.on('interact:selectionchange', handleSelectionChange)
    return () => {
      eventBus.off(EVENTS.MAP_SET_ACTIVE_ITEM, handleSetActive)
      eventBus.off('interact:selectionchange', handleSelectionChange)
    }
  }, [eventBus])
}

/**
 * Re-picks the active item (ARIA priority order) when it drops out of the item list while
 * focused — e.g. panned off screen — and moves real focus to it.
 */
function useItemsRevalidation ({ items, eventBus, isFocusedRef, spatialListRef, isInternalFocusMoveRef, lastActiveIdRef, activeItemIdRef, selectedIdsRef, setActiveItemId, centerScreenPoint }) {
  useEffect(() => {
    if (!isFocusedRef.current) {
      return
    }
    if (!items.length) {
      setActiveItemId(null)
      eventBus?.emit(EVENTS.MAP_SET_ACTIVE_ITEM, { id: null })
      return
    }
    if (items.some(item => item.id === activeItemIdRef.current)) {
      return
    }
    const nextId = resolveEntryId(items, lastActiveIdRef.current, selectedIdsRef.current, centerScreenPoint)
    lastActiveIdRef.current = nextId
    setActiveItemId(nextId)
    eventBus?.emit(EVENTS.MAP_SET_ACTIVE_ITEM, { id: nextId })
    focusOption(spatialListRef.current, nextId, isInternalFocusMoveRef)
  }, [items]) // NOSONAR — eventBus/selectedIds consumed via refs to avoid spurious re-runs on selection change
}

/**
 * Attaches keydown/keyup listeners to the listbox element for ARIA keyboard navigation:
 * - ArrowUp/ArrowDown — move the active item sequentially, moving real focus (roving tabindex)
 * - Alt+Arrow (any of the four) — move the active item spatially, to whichever item is
 *   nearest in the pressed direction on screen, same roving-tabindex move as above
 * - Home/End — jump the active item to the first/last option
 * - Enter/Space — confirm selection, emitting MAP_SELECT_ITEM
 * - Escape — return focus to the map viewport
 */
function useKeyboardNavigation ({ spatialListRef, viewportRef, items, eventBus, activeItemIdRef, lastActiveIdRef, setActiveItemId, isInternalFocusMoveRef, hints, currentHintRef }) {
  useEffect(() => {
    const listboxEl = spatialListRef.current
    if (!listboxEl) {
      return undefined
    }
    const moveTo = (newId) => {
      lastActiveIdRef.current = newId
      setActiveItemId(newId)
      eventBus?.emit(EVENTS.MAP_SET_ACTIVE_ITEM, { id: newId })
      focusOption(listboxEl, newId, isInternalFocusMoveRef)
    }
    const handleEscape = () => {
      if (currentHintRef.current) {
        hints.dismiss()
      } else {
        viewportRef.current?.focus()
      }
    }
    // Same modifier as the map's own label navigation, but moves list items instead of labels
    // while this listbox has focus — the keyup listener below stops it bubbling to that binding.
    const handleSpatialMove = (event) => {
      moveTo(findNearestItemInDirection(items, activeItemIdRef.current, event.key))
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        handleEscape()
      } else if (event.altKey && ARROW_KEYS.has(event.key)) {
        // preventDefault here (on keydown) suppresses the browser's own Alt+Arrow
        // history-navigation default.
        event.preventDefault()
        event.stopPropagation()
        handleSpatialMove(event)
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
        event.preventDefault()
        event.stopPropagation()
        moveTo(getNavigatedId(activeItemIdRef.current, event.key, items))
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        event.stopPropagation()
        eventBus?.emit(EVENTS.MAP_SELECT_ITEM)
      } else {
        // No action
      }
    }
    // Shadows global Alt+<key> shortcuts (src/utils/globalAltShortcuts.js) from bubbling to
    // the app-wide handler while this listbox has focus.
    const handleKeyUp = (event) => {
      stopIfGlobalAltKey(event)
    }
    listboxEl.addEventListener('keydown', handleKeyDown)
    listboxEl.addEventListener('keyup', handleKeyUp)
    return () => {
      listboxEl.removeEventListener('keydown', handleKeyDown)
      listboxEl.removeEventListener('keyup', handleKeyUp)
    }
  }, [viewportRef, spatialListRef, items, eventBus])
}

/**
 * Returns focus to the viewport when the user interacts with the map via pointer while the
 * listbox is focused — clears its focus ring without dropping focus to nowhere.
 */
function useMapInteractionBlur ({ viewportRef, spatialListRef, isFocusedRef }) {
  useEffect(() => {
    const el = viewportRef.current
    if (!el) {
      return undefined
    }
    const handlePointerDown = (event) => {
      if (isFocusedRef.current && !spatialListRef.current?.contains(event.target)) {
        viewportRef.current?.focus()
      }
    }
    el.addEventListener('pointerdown', handlePointerDown)
    return () => { el.removeEventListener('pointerdown', handlePointerDown) }
  }, [viewportRef, spatialListRef])
}

/**
 * Manages roving-tabindex focus state for the keyboard-accessible feature list. On focus, sets
 * activeItemId via ARIA priority order (see resolveEntryId); on blur, clears it. Revalidates
 * when the item list changes (e.g. after a map pan) so it never points to a stale item.
 *
 * @param {{ viewportRef: React.RefObject, spatialListRef: React.RefObject, items: Array, eventBus: object, centerScreenPoint: {x: number, y: number}|null }} params
 * @returns {{ activeItemId: string|null, tabbableId: string|null, selectedIds: string[], onFocus: Function, onBlur: Function, selectItem: Function }}
 */
export function useSpatialListFocus ({ viewportRef, spatialListRef, items = [], eventBus, hints, centerScreenPoint }) {
  const [activeItemId, setActiveItemId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])

  const isFocusedRef = useRef(false)
  const lastActiveIdRef = useRef(null) // preserved across blur; restores position on re-focus
  const activeItemIdRef = useRef(null) // always-current for keydown closure
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
  activeItemIdRef.current = activeItemId
  selectedIdsRef.current = selectedIds

  useEventBusListeners({ eventBus, lastActiveIdRef, setActiveItemId, setSelectedIds })
  useItemsRevalidation({ items, eventBus, isFocusedRef, spatialListRef, isInternalFocusMoveRef, lastActiveIdRef, activeItemIdRef, selectedIdsRef, setActiveItemId, centerScreenPoint })
  useKeyboardNavigation({ spatialListRef, viewportRef, items, eventBus, activeItemIdRef, lastActiveIdRef, setActiveItemId, isInternalFocusMoveRef, hints, currentHintRef })
  useMapInteractionBlur({ viewportRef, spatialListRef, isFocusedRef })

  // Resting roving-tabindex position — where Tab lands before the list has ever had real focus.
  // Deliberately never selection-driven (unlike onFocus's own resolution below): sticks to the
  // last established keyboard position so an unrelated selection change elsewhere doesn't
  // relocate it.
  let tabbableId = null
  if (items.length) {
    const hasEstablishedPosition = lastActiveIdRef.current && items.some(item => item.id === lastActiveIdRef.current)
    tabbableId = hasEstablishedPosition ? lastActiveIdRef.current : (findNearestToCenter(items, centerScreenPoint) ?? items[0].id)
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
    // A real Tab-in prefers a selected item over the remembered position (native listbox
    // behaviour) — unlike tabbableId, which deliberately ignores selection.
    const id = resolveEntryId(items, lastActiveIdRef.current, selectedIds, centerScreenPoint)
    lastActiveIdRef.current = id
    setActiveItemId(id)
    eventBus?.emit(EVENTS.MAP_SET_ACTIVE_ITEM, { id })
    // Real focus may have landed on a different option than this resolves to (tabbableId and
    // resolveEntryId can legitimately disagree) — move it to match so it never disagrees with activeItemId.
    focusOption(spatialListRef.current, id, isInternalFocusMoveRef)
  }

  const onBlur = () => {
    // Ignore focus moving between sibling options (roving tabindex) — not a real exit.
    if (isInternalFocusMoveRef.current) {
      return
    }
    isFocusedRef.current = false
    setActiveItemId(null)
    eventBus?.emit(EVENTS.MAP_SET_ACTIVE_ITEM, { id: null })
  }

  // Mirrors keyboard Enter/Space: make the clicked item active, focus it, then confirm selection.
  const selectItem = (id) => {
    lastActiveIdRef.current = id
    setActiveItemId(id)
    eventBus?.emit(EVENTS.MAP_SET_ACTIVE_ITEM, { id })
    focusOption(spatialListRef.current, id, isInternalFocusMoveRef)
    eventBus?.emit(EVENTS.MAP_SELECT_ITEM)
  }

  return { activeItemId, tabbableId, selectedIds, onFocus, onBlur, selectItem }
}
