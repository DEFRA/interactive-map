import React, { useRef, useEffect } from 'react'
import { useFeatureFocus } from '../../hooks/useFeatureFocus.js'
import { useFeatureItems } from '../../hooks/useFeatureItems.js'
import { EVENTS as events } from '../../../config/events.js'
import { useConfig } from '../../store/configContext.js'
import { useApp } from '../../store/appContext.js'
import { useMap } from '../../store/mapContext.js'
import { useService } from '../../store/serviceContext.js'
import { MapController } from './MapController.jsx'
import { useKeyboardHint } from '../../hooks/useKeyboardHint.js'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.js'
import { useMapEvents } from '../../hooks/useMapEvents.js'
import { MapStatus } from './MapStatus.jsx'
import { CrossHair } from '../CrossHair/CrossHair'
import { Features } from './Features'
import { Markers } from '../Markers/Markers'

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Viewport = () => {
  const { id, mapProvider, mapLabel, keyboardHintText } = useConfig()
  const { interfaceType, mode, previousMode, layoutRefs, safeZoneInset } = useApp()
  const { mapSize } = useMap()
  const { eventBus, hint, hintManager } = useService()

  const mapContainerRef = useRef(null)
  const featuresRef = useRef(null)

  const { items: featureItems, multiselectable } = useFeatureItems(eventBus)
  const { activeFeatureId, selectedIds, onFocus: handleFeaturesFocus, onBlur: handleFeaturesBlur } = useFeatureFocus({ viewportRef: layoutRefs.viewportRef, featuresRef, items: featureItems, eventBus })

  const onFeaturesFocus = () => { handleFeaturesFocus(); hint(keyboardHintText, { duration: 0 }) }
  const onFeaturesBlur = () => { handleFeaturesBlur(); hintManager.dismiss() }

  useKeyboardShortcuts(layoutRefs.viewportRef)

  useMapEvents({
    [events.MAP_CLICK]: () => mapProvider?.clearHighlightedLabel?.()
  })

  const { handleFocus, handleBlur } = useKeyboardHint({
    interfaceType,
    containerRef: layoutRefs.viewportRef,
    onViewportFocusChange: (visible) => {
      if (visible) {
        hint(keyboardHintText, { duration: 0 })
      } else {
        hintManager.dismiss()
      }
    }
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
        aria-describedby={`${id}-keyboard-desc`}
        aria-controls={`${id}-features`}
      >
        <div className='im-c-viewport__map-container' ref={mapContainerRef} aria-hidden='true' />
        <MapStatus />
        <div className='im-c-viewport__safezone' style={safeZoneInset} ref={layoutRefs.safeZoneRef} aria-hidden='true'>
          <CrossHair />
        </div>
        <div className='im-c-viewport__markers' aria-hidden='true'>
          <Markers />
        </div>
      </div>
      <Features ref={featuresRef} activeFeatureId={activeFeatureId} selectedIds={selectedIds} multiselectable={multiselectable} items={featureItems} onFocus={onFeaturesFocus} onBlur={onFeaturesBlur} />
    </>
  )
}
