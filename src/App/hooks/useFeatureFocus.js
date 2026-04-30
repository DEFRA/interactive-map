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

export function useFeatureFocus ({ viewportRef, featuresRef, items = [], eventBus }) {
  const [activeFeatureId, setActiveFeatureId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])

  const isFocusedRef = useRef(false)
  const lastActiveIdRef = useRef(null) // preserved across blur; restores position on re-focus
  const activeFeatureIdRef = useRef(null) // always-current for keydown closure
  const selectedIdsRef = useRef([]) // always-current for items-change effect

  useEffect(() => { activeFeatureIdRef.current = activeFeatureId }, [activeFeatureId])
  useEffect(() => { selectedIdsRef.current = selectedIds }, [selectedIds])

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

  // When items change while focused, revalidate: keep current if still present, else re-pick
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
