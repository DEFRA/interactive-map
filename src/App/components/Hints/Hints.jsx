import React, { useState, useEffect } from 'react'
import { useConfig } from '../../store/configContext.js'
import { useService } from '../../store/serviceContext.js'
import { htmlToPlainText } from '../../../utils/htmlToPlainText.js'

/**
 * Renders the active keyboard hint as a toast. Layout puts it just before the bottom row, so it's
 * read in the order it's shown, and useLayoutMeasurements keeps it clear of the bottom row and the
 * actions bar (--hint-bottom). All visual hints pass through here; screen reader announcements are
 * handled internally by the hints service so callers only need hints.show().
 *
 * The container element (id="${mapId}-hints") is always in the DOM so aria-describedby references
 * remain valid even when no hint is showing.
 */
// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Hints = () => {
  const { id, keyboardHintText, enableMapControls, mapControlsHintText } = useConfig()
  const { hints } = useService()
  const [activeHint, setActiveHint] = useState(null)

  useEffect(() => hints.subscribe(setActiveHint), [hints])

  // Composed at render time so overriding one text doesn't drop the other.
  const keyboardDescriptionHtml = enableMapControls
    ? `${keyboardHintText} ${mapControlsHintText}`
    : keyboardHintText

  return (
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
        dangerouslySetInnerHTML={{ __html: htmlToPlainText(keyboardDescriptionHtml) }}
      />
    </div>
  )
}
