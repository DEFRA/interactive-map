import { useEffect } from 'react'
import { keyboardMappings } from '../controls/keyboardMappings.js'
import { createKeyboardActions } from '../controls/keyboardActions.js'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { useService } from '../store/serviceContext.js'

export function useKeyboardShortcuts (containerRef) {
  const { mapProvider, panDelta, nudgePanDelta, zoomDelta, nudgeZoomDelta, readMapText } = useConfig()
  const { interfaceType, dispatch } = useApp()
  const { announce } = useService()

  useEffect(() => {
    const el = containerRef.current
    if (!el || interfaceType !== 'keyboard') {
      return undefined
    }

    const actions = createKeyboardActions(mapProvider, announce, {
      containerRef,
      dispatch,
      panDelta,
      nudgePanDelta,
      zoomDelta,
      nudgeZoomDelta,
      readMapText
    })

    const normalizeKey = (e) => {
      let key

      // Use e.code for letters to avoid 'dead' keys with Alt/AltGr
      if (/^Key[A-Z]$/.test(e.code)) {
        key = e.code.slice(3) // NOSONAR: strip "Key" prefix, e.g. "KeyI" -> "I"
      } else {
        key = e.key // works for arrows, numpad, punctuation
      }

      // Normalize numpad add/subtract to symbols
      if (key === 'Add' || key === 'NumpadAdd') {
        key = '+'
      } else if (key === 'Subtract' || key === 'NumpadSubtract') {
        key = '-'
      } else {
        // No action
      }

      return e.altKey ? `Alt+${key}` : key
    }

    const handle = (type) => (e) => {
      const actionName = keyboardMappings[type][normalizeKey(e)]
      if (actionName && actions[actionName]) {
        actions[actionName](e)
        e.preventDefault()
      }
    }

    const handleKeyDown = handle('keydown')
    const handleKeyUp = handle('keyup')

    el.addEventListener('keydown', handleKeyDown)
    el.addEventListener('keyup', handleKeyUp)

    return () => {
      el.removeEventListener('keydown', handleKeyDown)
      el.removeEventListener('keyup', handleKeyUp)
    }
  }, [
    containerRef,
    interfaceType,
    mapProvider,
    panDelta,
    nudgePanDelta,
    zoomDelta,
    nudgeZoomDelta
  ])
}
