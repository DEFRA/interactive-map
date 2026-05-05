import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useConfig } from '../../store/configContext.js'
import { useService } from '../../store/serviceContext.js'
import { useApp } from '../../store/appContext.js'

/**
 * Renders the active keyboard hint as a toast portaled into im-o-app__main.
 * Positioned above the actions bar using --keyboard-hint-bottom. All visual
 * hints pass through here; screen reader announcements are handled internally
 * by the hints service so callers only need hints.show().
 *
 * The container element (id="${mapId}-hints") is always in the DOM after mount
 * so aria-describedby references remain valid even when no hint is showing.
 */
export const KeyboardHints = () => {
  const { id, keyboardHintText } = useConfig()
  const { hints } = useService()
  const { layoutRefs } = useApp()
  const [activeHint, setActiveHint] = useState(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return hints.subscribe(setActiveHint)
  }, [hints])

  if (!mounted || !layoutRefs.mainRef?.current) {
    return null
  }

  return createPortal(
    <div className='im-o-keyboard-hints'>
      <div id={`${id}-hints`} className='im-c-keyboard-hints'>
        {activeHint && (
          <div
            className='im-c-keyboard-hints__hint'
            dangerouslySetInnerHTML={{ __html: activeHint.html }}
          />
        )}
      </div>
      <div
        id={`${id}-keyboard-desc`}
        className='im-u-visually-hidden'
        dangerouslySetInnerHTML={{ __html: keyboardHintText }}
      />
    </div>,
    layoutRefs.mainRef.current
  )
}
