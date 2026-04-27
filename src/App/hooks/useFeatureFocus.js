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
    const el = featuresRef.current
    if (!el) {
      return undefined
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setActiveFeatureId(null)
        viewportRef.current?.focus()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveFeatureId(id => getNavigatedId(id, e.key, items))
      } else {
        // No action
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    return () => { el.removeEventListener('keydown', handleKeyDown) }
  }, [viewportRef, featuresRef, items])

  const onFocus = () => {
    if (items.length) {
      setActiveFeatureId(items[0].id)
    }
  }

  return { activeFeatureId, onFocus }
}
