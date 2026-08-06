import { useEffect, useRef } from 'react'
import { EVENTS as events } from '../../config/events.js'
import { useService } from '../store/serviceContext.js'
import { useApp } from '../store/appContext.js'

/**
 * Wires the public showHint()/dismissHint() API onto the hints service.
 * The hints service already owns its own subscriber list (see Hints.jsx),
 * so this just forwards eventBus commands to it — no React state involved.
 */
export const useHintsAPI = () => {
  const { eventBus, hints } = useService()
  const { layoutRefs } = useApp()
  const isHintActiveRef = useRef(false)

  useEffect(() => {
    const handleShowHint = ({ text, options } = {}) => {
      if (!text) {
        return
      }
      hints.show(text, options)
    }
    const handleDismissHint = () => hints.dismiss()

    eventBus.on(events.APP_SHOW_HINT, handleShowHint)
    eventBus.on(events.APP_DISMISS_HINT, handleDismissHint)

    return () => {
      eventBus.off(events.APP_SHOW_HINT, handleShowHint)
      eventBus.off(events.APP_DISMISS_HINT, handleDismissHint)
    }
  }, [eventBus, hints])

  // Escape dismisses the active hint when the keypress originates inside this
  // map instance. The viewport and features listbox already dismiss hints on
  // Escape within their own narrower focus scope (useKeyboardHint.js /
  // useFeatureFocus.js) — this covers hints shown via the public showHint()
  // API from anywhere else in the same map's UI (e.g. a plugin button).
  //
  // Listening on document (rather than the map's own container) and checking
  // containment ourselves, rather than a container-scoped listener, is
  // deliberate: with multiple map instances on one page, each has its own
  // hints service and its own isHintActiveRef, so without the containment
  // check an Escape press anywhere on the host page would dismiss a hint on
  // every instance that happened to have one showing — including maps the
  // user isn't even looking at.
  useEffect(() => {
    return hints.subscribe((hint) => {
      isHintActiveRef.current = Boolean(hint)
    })
  }, [hints])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape' || !isHintActiveRef.current) {
        return
      }
      const container = layoutRefs.appContainerRef?.current
      if (container && !container.contains(e.target)) {
        return
      }
      hints.dismiss()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [hints, layoutRefs])
}
