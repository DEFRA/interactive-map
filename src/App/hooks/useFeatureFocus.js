import { useState, useEffect } from 'react'

export function useFeatureFocus ({ viewportRef, featuresRef }) {
  const [activeFeatureId, setActiveFeatureId] = useState(null)

  useEffect(() => {
    const el = featuresRef.current
    if (!el) { return undefined }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        viewportRef.current?.focus()
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    return () => { el.removeEventListener('keydown', handleKeyDown) }
  }, [viewportRef, featuresRef])

  const enterFeatures = () => { featuresRef.current?.focus() }

  return { activeFeatureId, setActiveFeatureId, enterFeatures }
}
