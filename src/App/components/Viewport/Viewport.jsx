import React, { useRef, useEffect } from 'react'
import { useSpatialListFocus } from '../../hooks/useSpatialListFocus.js'
import { useSpatialListItems } from '../../hooks/useSpatialListItems.js'
import { EVENTS as events } from '../../../config/events.js'
import { scaleFactor } from '../../../config/appConfig.js'
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
import { SpatialList } from './SpatialList'
import { Markers } from '../Markers/Markers'

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Viewport = () => {
  const { id, mapProvider, mapLabel, keyboardHintText, focusOnMount } = useConfig()
  const { mode, previousMode, layoutRefs, safeZoneInset, dispatch } = useApp()
  const { mapSize, isMapReady } = useMap()
  const { eventBus, hints } = useService()

  const mapContainerRef = useRef(null)
  const spatialListRef = useRef(null)

  const { items: spatialListItems, multiselectable, label: spatialListLabel, focusable: spatialListFocusable } = useSpatialListItems(eventBus)
  // Same reference point as Alt+Enter's highlightLabelAtCenter — lets the listbox's entry
  // fallback prefer whichever item is nearest the middle of the view. Guarded on isMapReady:
  // the map engine doesn't exist yet on Viewport's first render, so mapToScreen()/getCenter()
  // would throw; null is a safe, already-handled value (falls back to the first item).
  let centerScreenPoint = null
  if (isMapReady) {
    const centerPixel = mapProvider.mapToScreen(mapProvider.getCenter())
    centerScreenPoint = { x: centerPixel.x * scaleFactor[mapSize], y: centerPixel.y * scaleFactor[mapSize] }
  }
  const { activeItemId, tabbableId, selectedIds, onFocus: handleSpatialListFocus, onBlur: handleSpatialListBlur, selectItem } = useSpatialListFocus({ viewportRef: layoutRefs.viewportRef, spatialListRef, items: spatialListItems, eventBus, hints, centerScreenPoint })

  useEffect(() => {
    const handler = () => dispatch({ type: 'SET_LISTBOX_ACTIVE' })
    eventBus.on('interact:listboxcapable', handler)
    return () => eventBus.off('interact:listboxcapable', handler)
  }, [eventBus])

  const onSpatialListFocus = () => { handleSpatialListFocus(); hints.show(keyboardHintText, { duration: 0 }) }
  const onSpatialListBlur = () => { handleSpatialListBlur(); hints.dismiss() }

  useKeyboardShortcuts(layoutRefs.viewportRef)

  useMapEvents({
    [events.MAP_CLICK]: () => mapProvider?.clearHighlightedLabel?.()
  })

  const { handleFocus, handleBlur } = useKeyboardHint({
    containerRef: layoutRefs.viewportRef,
    onViewportFocusChange: (visible) => {
      if (visible) {
        hints.show(keyboardHintText, { duration: 0 })
      } else {
        hints.dismiss()
      }
    }
  })

  // Set focus on viewport on mode change
  useEffect(() => {
    if (mode && previousMode && mode !== previousMode) {
      layoutRefs.viewportRef?.current.focus()
    }
  }, [mode])

  // Focus the viewport on mount when opened by a genuine launcher click (see InteractiveMap.js's _handleButtonClick), never on an auto-load or resize.
  useEffect(() => {
    if (focusOnMount) {
      layoutRefs.viewportRef?.current.focus()
    }
  }, [])

  return (
    <>
      <MapController mapContainerRef={mapContainerRef} />
      <div
        id={`${id}-viewport`}
        className={`im-c-viewport im-c-viewport--${mapSize}`}
        aria-label={mapLabel}
        role='application'
        tabIndex='0' // nosonar
        data-map-keyboard-scope
        onFocus={handleFocus}
        onBlur={handleBlur}
        ref={layoutRefs.viewportRef}
        aria-describedby={`${id}-keyboard-desc`}
        aria-controls={`${id}-features`}
      >
        <div className='im-c-viewport__map-container' ref={mapContainerRef} aria-hidden='true' />
        <MapStatus />
        <div className='im-c-viewport__safezone' style={safeZoneInset} ref={layoutRefs.safeZoneRef}>
          <CrossHair />
        </div>
        <div className='im-c-viewport__markers' aria-hidden='true'>
          <Markers />
        </div>
      </div>
      <SpatialList ref={spatialListRef} activeItemId={activeItemId} tabbableId={tabbableId} selectedIds={selectedIds} multiselectable={multiselectable} items={spatialListItems} label={spatialListLabel} focusable={spatialListFocusable} onFocus={onSpatialListFocus} onBlur={onSpatialListBlur} onSelectItem={selectItem} />
    </>
  )
}
