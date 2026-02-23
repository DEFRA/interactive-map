import { useEffect } from 'react'

export function useKeyboardHint ({
  interfaceType,
  containerRef,
  keyboardHintRef,
  keyboardHintVisible,
  onViewportFocusChange
}) {
  const showHint = keyboardHintVisible

  useEffect(() => {
    if (!showHint || !containerRef.current) {
      return undefined
    }

    const containerEl = containerRef.current

    const handleKeyDown = (e) => {
      if (['Escape', 'Tab'].includes(e.key)) {
        onViewportFocusChange(false)
      }
    }

    const handleMouseDown = (e) => {
      const clickedInsideViewport = containerEl.contains(e.target)
      const clickedInsideHint = keyboardHintRef.current?.contains(e.target)

      if (clickedInsideViewport && !clickedInsideHint) {
        onViewportFocusChange(false)
      }
    }

    containerEl.addEventListener('keydown', handleKeyDown)
    containerEl.addEventListener('mousedown', handleMouseDown)

    return () => {
      containerEl.removeEventListener('keydown', handleKeyDown)
      containerEl.removeEventListener('mousedown', handleMouseDown)
    }
  }, [showHint, containerRef, keyboardHintRef, onViewportFocusChange])

  const handleFocus = () => {
    if (interfaceType === 'keyboard') {
      onViewportFocusChange(true)
    }
  }

  const handleBlur = () => {
    onViewportFocusChange(false)
  }

  return {
    showHint,
    handleFocus,
    handleBlur
  }
}
