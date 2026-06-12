import { useCallback, useEffect, useRef } from 'react'

export function useCrossHairVisibility ({ crossHair, enabled, selectMarkerOnly, appState }) {
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const selectMarkerOnlyRef = useRef(selectMarkerOnly)
  selectMarkerOnlyRef.current = selectMarkerOnly
  const crossHairRef = useRef(crossHair)
  crossHairRef.current = crossHair
  const listboxFocusRef = useRef(false)
  const interfaceTypeRef = useRef(appState.interfaceType)
  interfaceTypeRef.current = appState.interfaceType

  const updateCrossHair = useCallback(() => {
    const type = interfaceTypeRef.current
    const isToK = ['touch', 'keyboard'].includes(type)
    if (enabledRef.current && !listboxFocusRef.current && isToK && !(type === 'touch' && selectMarkerOnlyRef.current)) {
      crossHairRef.current.fixAtCenter()
    } else {
      crossHairRef.current.hide()
    }
  }, [])

  useEffect(() => {
    updateCrossHair()
  }, [enabled, selectMarkerOnly, appState.interfaceType, updateCrossHair])

  useEffect(() => {
    const container = appState.layoutRefs?.appContainerRef?.current
    if (!container) { return undefined }
    const handleFocusIn = (e) => {
      const inListbox = !!e.target.closest('[role="listbox"], [role="option"]')
      if (listboxFocusRef.current !== inListbox) {
        listboxFocusRef.current = inListbox
        updateCrossHair()
      }
    }
    container.addEventListener('focusin', handleFocusIn)
    return () => { container.removeEventListener('focusin', handleFocusIn) }
  }, [appState.layoutRefs, updateCrossHair])
}
