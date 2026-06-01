import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useConfig } from '../../store/configContext.js'
import { useService } from '../../store/serviceContext.js'
import { useApp } from '../../store/appContext.js'
import { htmlToPlainText } from '../../../utils/htmlToPlainText.js'

/**
 * Renders the active keyboard hint as a toast portaled into im-o-app__main.
 * Positioned above the actions bar using --hint-bottom. All visual
 * hints pass through here; screen reader announcements are handled internally
 * by the hints service so callers only need hints.show().
 *
 * The container element (id="${mapId}-hints") is always in the DOM after mount
 * so aria-describedby references remain valid even when no hint is showing.
 */
// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Hints = () => {
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
    <div className='im-o-hints'>
      <div id={`${id}-hints`} className='im-c-hints'>
        {activeHint && (
          <div
            className='im-c-hints__hint'
            dangerouslySetInnerHTML={{ __html: activeHint.html }}
          />
        )}
      </div>
      <div
        id={`${id}-keyboard-desc`}
        className='im-u-visually-hidden'
        dangerouslySetInnerHTML={{ __html: htmlToPlainText(keyboardHintText) }}
      />
    </div>,
    layoutRefs.mainRef.current
  )
}
