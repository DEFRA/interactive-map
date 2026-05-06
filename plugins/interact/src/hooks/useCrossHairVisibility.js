import { useCallback, useEffect, useRef } from 'react'
import { getInterfaceType, subscribeToInterfaceChangesImmediate } from '../../../../src/utils/detectInterfaceType.js'

export function useCrossHairVisibility ({ crossHair, enabled, selectMarkerOnly, appState }) {
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const selectMarkerOnlyRef = useRef(selectMarkerOnly)
  selectMarkerOnlyRef.current = selectMarkerOnly
  const crossHairRef = useRef(crossHair)
  crossHairRef.current = crossHair
  const listboxFocusRef = useRef(false)

  const updateCrossHair = useCallback(() => {
    const type = getInterfaceType()
    const isToK = ['touch', 'keyboard'].includes(type)
    if (enabledRef.current && !listboxFocusRef.current && isToK && !(type === 'touch' && selectMarkerOnlyRef.current)) {
      crossHairRef.current.fixAtCenter()
    } else {
      crossHairRef.current.hide()
    }
  }, [])

  // Toggle target marker visibility on enabled/interactionModes changes
  useEffect(() => {
    updateCrossHair()
  }, [enabled, selectMarkerOnly, updateCrossHair])

  // Toggle target marker visibility immediately on interface type change (no 150ms React delay)
  useEffect(() => {
    return subscribeToInterfaceChangesImmediate(updateCrossHair)
  }, [updateCrossHair])

  // Hide crosshair when listbox has focus
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
