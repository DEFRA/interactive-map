import { useCallback, useEffect, useRef } from 'react'

const LISTBOX_SELECTOR = '[role="listbox"], [role="option"]'

export function useCrossHairVisibility ({ crossHair, enabled, targetNeeded, appState, dispatch }) {
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const targetNeededRef = useRef(targetNeeded)
  targetNeededRef.current = targetNeeded
  const crossHairRef = useRef(crossHair)
  crossHairRef.current = crossHair
  const dispatchRef = useRef(dispatch)
  dispatchRef.current = dispatch
  const listboxFocusRef = useRef(false)
  // True while focus is inside an element (marked `data-map-keyboard-scope`) that actually routes cursor keys to the map, e.g. the viewport or MapControl's D-pad.
  const mapKeyboardScopedRef = useRef(false)
  const interfaceTypeRef = useRef(appState.interfaceType)
  interfaceTypeRef.current = appState.interfaceType

  const updateCrossHair = useCallback(() => {
    const keyboardCanOperateMap = interfaceTypeRef.current === 'keyboard' && mapKeyboardScopedRef.current
    // hide() is a no-op while MapControls is open (useCrossHairAPI.js), so listbox focus never hides it then.
    const targetCanShow = targetNeededRef.current && !listboxFocusRef.current
    if (enabledRef.current && (keyboardCanOperateMap || targetCanShow)) {
      crossHairRef.current.fixAtCenter()
    } else {
      crossHairRef.current.hide()
    }
  }, [])

  useEffect(() => {
    updateCrossHair()
  }, [enabled, targetNeeded, appState.interfaceType, updateCrossHair])

  useEffect(() => {
    const container = appState.layoutRefs?.appContainerRef?.current
    if (!container) { return undefined }
    const setListboxFocus = (inListbox) => {
      listboxFocusRef.current = inListbox
      // Mirrored into plugin state so the Select button (manifest hiddenWhen) hides with the crosshair.
      dispatchRef.current?.({ type: 'SET_LISTBOX_FOCUSED', payload: inListbox })
    }
    mapKeyboardScopedRef.current = !!document.activeElement?.closest('[data-map-keyboard-scope]')
    if (document.activeElement?.closest(LISTBOX_SELECTOR)) {
      setListboxFocus(true)
    }
    const handleFocusIn = (e) => {
      const inListbox = !!e.target.closest(LISTBOX_SELECTOR)
      const inMapKeyboardScope = !!e.target.closest('[data-map-keyboard-scope]')
      const listboxChanged = listboxFocusRef.current !== inListbox
      const changed = listboxChanged || mapKeyboardScopedRef.current !== inMapKeyboardScope
      if (listboxChanged) {
        setListboxFocus(inListbox)
      }
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
