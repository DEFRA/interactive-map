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
import { MapStatus } from './MapStatus.jsx'
import { CrossHair } from '../CrossHair/CrossHair'
import { Markers } from '../Markers/Markers'

export const Viewport = ({ keyboardHintPortalRef }) => {
  const { id, mapProvider, mapLabel, keyboardHintText } = useConfig()
  const { interfaceType, mode, previousMode, layoutRefs, safeZoneInset } = useApp()
  const { mapSize } = useMap()

  const mapContainerRef = useRef(null)
  const keyboardHintRef = useRef(null)

  // Local state for keyboard hint visibility
  const [keyboardHintVisible, setKeyboardHintVisible] = useState(false)

  // Attach map keyboard controls
  useKeyboardShortcuts(layoutRefs.viewportRef)

  // Attach map events
  useMapEvents({
    [events.MAP_CLICK]: (e) => mapProvider?.clearHighlightedLabel?.()
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

  // Toggle external class based on keyboard hint
  useEffect(() => {
    const mainEl = layoutRefs.mainRef?.current
    if (!mainEl) {
      return
    }

    mainEl.classList.toggle('im-o-app__main--keyboard-hint-visible', showHint)

    return () => mainEl?.classList.remove('im-o-app__main--keyboard-hint-visible')
  }, [showHint])

  return (
    <>
      <MapController mapContainerRef={mapContainerRef} />
      <div
        id={`${id}-viewport`}
        className={`im-c-viewport im-c-viewport--${mapSize}`}
        aria-label={mapLabel}
        role='application'
        tabIndex='0'
        onFocus={handleFocus}
        onBlur={handleBlur}
        ref={layoutRefs.viewportRef}
      >
        {showHint && keyboardHintPortalRef?.current && createPortal(
          <div
            className='im-c-viewport__keyboard-hint'
            aria-hidden='true'
            ref={keyboardHintRef}
            dangerouslySetInnerHTML={{ __html: keyboardHintText }}
          />,
          keyboardHintPortalRef.current
        )}
        <div className='im-c-viewport__map-container' ref={mapContainerRef} />
        <div className='im-c-viewport__features' />
        <MapStatus />
        <div className='im-c-viewport__safezone' style={safeZoneInset} ref={layoutRefs.safeZoneRef}>
          <CrossHair />
        </div>
        <Markers />
      </div>
    </>
  )
}
