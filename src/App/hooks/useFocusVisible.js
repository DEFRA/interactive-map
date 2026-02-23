import { useEffect, useRef } from 'react'
import { useApp } from '../store/appContext.js'

export function useFocusVisible () {
  const { interfaceType, layoutRefs } = useApp()
  const interfaceTypeRef = useRef(interfaceType)

  // Keep ref in sync - synchronous update ensures it's always current
  interfaceTypeRef.current = interfaceType

  useEffect(() => {
    const scope = layoutRefs.appContainerRef.current
    if (!scope) {
      return undefined
    }

    function handleFocusIn (e) {
      e.target.dataset.focusVisible = interfaceTypeRef.current === 'keyboard'
    }

    function handleFocusOut (e) {
      delete e.target.dataset.focusVisible
    }

    function handlePointerdown () {
      delete document.activeElement.dataset.focusVisible
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)
    document.addEventListener('pointerdown', handlePointerdown)

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
      document.removeEventListener('pointerdown', handlePointerdown)
    }
  }, [layoutRefs.appContainerRef])
}
