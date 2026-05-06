import { useEffect } from 'react'
import { useApp } from '../store/appContext.js'
import { getInterfaceType } from '../../utils/detectInterfaceType.js'

export function useFocusVisible () {
  const { layoutRefs } = useApp()

  useEffect(() => {
    const scope = layoutRefs.appContainerRef.current
    if (!scope) {
      return undefined
    }

    function handleFocusIn (e) {
      e.target.dataset.focusVisible = getInterfaceType() === 'keyboard'
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
