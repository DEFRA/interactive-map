import { useState, useEffect } from 'react'

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

export function useFeatureFocus ({ viewportRef, featuresRef, items = [] }) {
  const [activeFeatureId, setActiveFeatureId] = useState(null)

  useEffect(() => {
    const listboxEl = featuresRef.current
    if (!listboxEl) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setActiveFeatureId(null)
        viewportRef.current?.focus()
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveFeatureId(id => getNavigatedId(id, event.key, items))
      } else {
        // No action
      }
    }

    listboxEl.addEventListener('keydown', handleKeyDown)
    return () => { listboxEl.removeEventListener('keydown', handleKeyDown) }
  }, [viewportRef, featuresRef, items])

  const onFocus = () => {
    if (items.length) {
      setActiveFeatureId(items[0].id)
    }
  }

  return { activeFeatureId, onFocus }
}
