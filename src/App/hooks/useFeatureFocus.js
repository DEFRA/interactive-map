import { useState, useEffect, useRef } from 'react'
import { EVENTS } from '../../config/events.js'

const getNavigatedId = (id, key, items) => {
  if (!items.length) {
    return id
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

/**
 * Keeps local selectedIds in sync with interact:selectionchange, and mirrors
 * MAP_SET_ACTIVE_FEATURE back into React state so aria-activedescendant stays current.
 * Also tracks the last non-null active id so it can be restored on re-focus.
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
 * Revalidates aria-activedescendant when the item list changes while the listbox is focused.
 * If the current active item is no longer in the list (e.g. panned off screen), picks a new one
 * using ARIA priority order: first selected → last active position → first item.
 * Reads eventBus and selectedIds via refs to avoid spurious re-runs on selection change.
 */
function useItemsRevalidation ({ items, eventBus, isFocusedRef, lastActiveIdRef, activeFeatureIdRef, selectedIdsRef, setActiveFeatureId }) {
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
  }, [items]) // NOSONAR — eventBus/selectedIds consumed via refs to avoid spurious re-runs on selection change
}

/**
 * Attaches a keydown listener to the listbox element for ARIA keyboard navigation:
 * - ArrowUp/ArrowDown — move the active item, emitting MAP_SET_ACTIVE_FEATURE
 * - Enter/Space — confirm selection, emitting MAP_SELECT_FEATURE
 * - Escape — return focus to the map viewport
 */
function useKeyboardNavigation ({ featuresRef, viewportRef, items, eventBus, activeFeatureIdRef, lastActiveIdRef, setActiveFeatureId }) {
  useEffect(() => {
    const listboxEl = featuresRef.current
    if (!listboxEl) {
      return undefined
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        viewportRef.current?.focus()
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        event.stopPropagation()
        const newId = getNavigatedId(activeFeatureIdRef.current, event.key, items)
        lastActiveIdRef.current = newId
        setActiveFeatureId(newId)
        eventBus?.emit(EVENTS.MAP_SET_ACTIVE_FEATURE, { id: newId })
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
 * Clears listbox focus whenever the user interacts with the map via pointer (mouse or touch).
 * Any pointerdown outside the listbox element moves focus to the viewport, removing the
 * visible focus ring from the listbox without dropping focus to an unknown location.
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
 * Manages ARIA listbox focus state for the keyboard-accessible feature list.
 *
 * On focus, sets aria-activedescendant following ARIA priority order:
 *   1. First selected item (if any)
 *   2. Last active position (if still in the list)
 *   3. First item (fallback)
 *
 * On blur, clears the active descendant. Revalidates automatically when the item list
 * changes (e.g. after a map pan) so the active id never points to a stale item.
 *
 * @param {{ viewportRef: React.RefObject, featuresRef: React.RefObject, items: Array, eventBus: object }} params
 * @returns {{ activeFeatureId: string|null, selectedIds: string[], onFocus: Function, onBlur: Function }}
 */
export function useFeatureFocus ({ viewportRef, featuresRef, items = [], eventBus }) {
  const [activeFeatureId, setActiveFeatureId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])

  const isFocusedRef = useRef(false)
  const lastActiveIdRef = useRef(null) // preserved across blur; restores position on re-focus
  const activeFeatureIdRef = useRef(null) // always-current for keydown closure
  const selectedIdsRef = useRef([]) // always-current for items-change effect

  useEffect(() => { activeFeatureIdRef.current = activeFeatureId }, [activeFeatureId])
  useEffect(() => { selectedIdsRef.current = selectedIds }, [selectedIds])

  useEventBusListeners({ eventBus, lastActiveIdRef, setActiveFeatureId, setSelectedIds })
  useItemsRevalidation({ items, eventBus, isFocusedRef, lastActiveIdRef, activeFeatureIdRef, selectedIdsRef, setActiveFeatureId })
  useKeyboardNavigation({ featuresRef, viewportRef, items, eventBus, activeFeatureIdRef, lastActiveIdRef, setActiveFeatureId })
  useMapInteractionBlur({ viewportRef, featuresRef, isFocusedRef })

  const onFocus = () => {
    isFocusedRef.current = true
    if (!items.length) {
      return
    }
    const id = resolveEntryId(items, lastActiveIdRef.current, selectedIds)
    lastActiveIdRef.current = id
    setActiveFeatureId(id)
    eventBus?.emit(EVENTS.MAP_SET_ACTIVE_FEATURE, { id })
  }

  const onBlur = () => {
    isFocusedRef.current = false
    setActiveFeatureId(null)
    eventBus?.emit(EVENTS.MAP_SET_ACTIVE_FEATURE, { id: null })
  }

  return { activeFeatureId, selectedIds, onFocus, onBlur }
}
