import { useCallback, useEffect, useRef } from 'react'

export function useCrossHairVisibility ({ crossHair, enabled, selectMarkerOnly, appState }) {
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const selectMarkerOnlyRef = useRef(selectMarkerOnly)
  selectMarkerOnlyRef.current = selectMarkerOnly
  const crossHairRef = useRef(crossHair)
  crossHairRef.current = crossHair
  const listboxFocusRef = useRef(false)
  // True while focus is inside an element (marked `data-map-keyboard-scope`) that actually routes cursor keys to the map, e.g. the viewport or MoveControl's D-pad.
  const mapKeyboardScopedRef = useRef(false)
  const interfaceTypeRef = useRef(appState.interfaceType)
  interfaceTypeRef.current = appState.interfaceType

  const updateCrossHair = useCallback(() => {
    const type = interfaceTypeRef.current
    const keyboardCanOperateMap = type === 'keyboard' && mapKeyboardScopedRef.current
    const touchCanOperateMap = type === 'touch' && !selectMarkerOnlyRef.current && !listboxFocusRef.current
    if (enabledRef.current && (keyboardCanOperateMap || touchCanOperateMap)) {
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
    mapKeyboardScopedRef.current = !!document.activeElement?.closest('[data-map-keyboard-scope]')
    const handleFocusIn = (e) => {
      const inListbox = !!e.target.closest('[role="listbox"], [role="option"]')
      const inMapKeyboardScope = !!e.target.closest('[data-map-keyboard-scope]')
      const changed = listboxFocusRef.current !== inListbox || mapKeyboardScopedRef.current !== inMapKeyboardScope
      listboxFocusRef.current = inListbox
      mapKeyboardScopedRef.current = inMapKeyboardScope
      // Keep the refs current regardless, but only touch the crosshair while enabled — while disabled, another owner (e.g. draw mode) is responsible for it.
      if (changed && enabledRef.current) {
        updateCrossHair()
      }
    }
    container.addEventListener('focusin', handleFocusIn)
    return () => { container.removeEventListener('focusin', handleFocusIn) }
  }, [appState.layoutRefs, updateCrossHair])
}
