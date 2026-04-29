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

export function useFeatureFocus ({ viewportRef, featuresRef, items = [], eventBus }) {
  const [activeFeatureId, setActiveFeatureId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const activeFeatureIdRef = useRef(null)

  useEffect(() => {
    activeFeatureIdRef.current = activeFeatureId
  }, [activeFeatureId])

  useEffect(() => {
    if (!eventBus) {
      return undefined
    }
    const handleSetActive = ({ id }) => { setActiveFeatureId(id) }
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
    if (items.length) {
      const firstId = items[0].id
      setActiveFeatureId(firstId)
      eventBus?.emit(EVENTS.MAP_SET_ACTIVE_FEATURE, { id: firstId })
    }
  }

  const onBlur = () => {
    setActiveFeatureId(null)
    eventBus?.emit(EVENTS.MAP_SET_ACTIVE_FEATURE, { id: null })
  }

  return { activeFeatureId, selectedIds, onFocus, onBlur }
}
