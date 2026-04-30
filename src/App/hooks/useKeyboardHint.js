import { useEffect } from 'react'

export function useKeyboardHint ({
  interfaceType,
  containerRef,
  onViewportFocusChange
}) {
  useEffect(() => {
    const el = containerRef.current
    if (!el) {
      return undefined
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onViewportFocusChange(false)
      }
    }
    el.addEventListener('keydown', handleKeyDown)
    return () => { el.removeEventListener('keydown', handleKeyDown) }
  }, [containerRef, onViewportFocusChange])

  const handleFocus = () => {
    if (interfaceType === 'keyboard') {
      onViewportFocusChange(true)
    }
  }

  const handleBlur = () => {
    onViewportFocusChange(false)
  }

  return { handleFocus, handleBlur }
}
