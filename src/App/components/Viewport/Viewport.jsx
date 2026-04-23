import React, { useRef, useEffect, useState } from 'react'
import { EVENTS as events } from '../../../config/events.js'
import { createPortal } from 'react-dom'
import { useConfig } from '../../store/configContext.js'
import { useApp } from '../../store/appContext.js'
import { useMap } from '../../store/mapContext.js'
import { MapController } from './MapController.jsx'
import { useKeyboardHint } from '../../hooks/useKeyboardHint.js'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.js'
import { useMapEvents } from '../../hooks/useMapEvents.js'
import { useFeatureFocus } from '../../hooks/useFeatureFocus.js'
import { MapStatus } from './MapStatus.jsx'
import { CrossHair } from '../CrossHair/CrossHair'
import { Features } from './Features'

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Viewport = () => {
  const { id, mapProvider, mapLabel, keyboardHintText } = useConfig()
  const { interfaceType, mode, previousMode, layoutRefs, safeZoneInset } = useApp()
  const { mainRef } = layoutRefs
  const { mapSize } = useMap()

  const mapContainerRef = useRef(null)
  const keyboardHintRef = useRef(null)
  const featuresRef = useRef(null)

  // Local state for keyboard hint visibility
  const [keyboardHintVisible, setKeyboardHintVisible] = useState(false)

  const { activeFeatureId, enterFeatures } = useFeatureFocus({
    viewportRef: layoutRefs.viewportRef,
    featuresRef
  })

  // Attach map keyboard controls
  useKeyboardShortcuts(layoutRefs.viewportRef, { onEnterFeatures: enterFeatures })

  // Attach map events
  useMapEvents({
    [events.MAP_CLICK]: () => mapProvider?.clearHighlightedLabel?.()
  })

  // Manage keyboard hint visibility using local state
  const { showHint, handleFocus, handleBlur } = useKeyboardHint({
    interfaceType,
    containerRef: layoutRefs.viewportRef,
    keyboardHintRef,
    keyboardHintVisible,
    onViewportFocusChange: setKeyboardHintVisible // update local state only
  })

  // Set focus on viewport on mode change
  useEffect(() => {
    if (mode && previousMode && mode !== previousMode) {
      layoutRefs.viewportRef?.current.focus()
    }
  }, [mode])

  return (
    <>
      <MapController mapContainerRef={mapContainerRef} />
      <div
        id={`${id}-viewport`}
        className={`im-c-viewport im-c-viewport--${mapSize}`}
        aria-label={mapLabel}
        role='application'
        tabIndex='0' // nosonar
        onFocus={handleFocus}
        onBlur={handleBlur}
        ref={layoutRefs.viewportRef}
        aria-describedby={`${id}-keyboard-hint`}
      >
        {mainRef?.current && createPortal(
          <div
            id={`${id}-keyboard-hint`}
            className={`im-c-viewport__keyboard-hint${showHint ? '' : ' im-u-visually-hidden'}`}
            ref={keyboardHintRef}
            dangerouslySetInnerHTML={{ __html: keyboardHintText }}
          />,
          mainRef.current
        )}
        <div className='im-c-viewport__map-container' ref={mapContainerRef} aria-hidden='true' />
        <MapStatus />
        <div className='im-c-viewport__safezone' style={safeZoneInset} ref={layoutRefs.safeZoneRef} aria-hidden='true'>
          <CrossHair />
        </div>
      </div>
      <Features ref={featuresRef} activeFeatureId={activeFeatureId} />
    </>
  )
}
