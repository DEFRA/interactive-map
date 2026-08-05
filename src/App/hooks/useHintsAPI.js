import { useEffect } from 'react'
import { EVENTS as events } from '../../config/events.js'
import { useService } from '../store/serviceContext.js'

/**
 * Wires the public showHint()/dismissHint() API onto the hints service.
 * The hints service already owns its own subscriber list (see Hints.jsx),
 * so this just forwards eventBus commands to it — no React state involved.
 */
export const useHintsAPI = () => {
  const { eventBus, hints } = useService()

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
}
