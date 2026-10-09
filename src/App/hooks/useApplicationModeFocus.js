import { useEffect } from 'react'
import { useApp } from '../store/appContext.js'

/**
 * Keeps focus somewhere visible when application modes change: if focus was inside the app on an
 * element a mode has just hidden (display: none leaves it with no client rects), it moves to the
 * map viewport. A plain useEffect so it runs after every item's own hiding has been applied,
 * including consumer HTML items, which are hidden in their own effects.
 */
export function useApplicationModeFocus () {
  const { applicationModeEntries, layoutRefs } = useApp()

  useEffect(() => {
    const appElement = layoutRefs.appContainerRef?.current
    const focusedElement = document.activeElement
    if (!appElement || !focusedElement || !appElement.contains(focusedElement) || focusedElement.getClientRects().length > 0) {
      return
    }
    layoutRefs.viewportRef?.current?.focus({ preventScroll: true })
  }, [applicationModeEntries])
}
