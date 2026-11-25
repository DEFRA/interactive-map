import React, { useRef, useEffect, useLayoutEffect } from 'react'
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
import { stripHtml } from '../../../services/hints.js'
import { getInterfaceType } from '../../../utils/detectInterfaceType.js'
import { CrossHair } from '../CrossHair/CrossHair'
import { SpatialList } from './SpatialList'
import { Markers } from '../Markers/Markers'

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Viewport = ({ isMapLoading = false }) => {
  const { id, mapProvider, mapLabel, mapLoading, mapLoadingText, mapLoadedText, mapLoadingTimeoutText, keyboardHintText, focusOnMount } = useConfig()
  const { layoutRefs, safeZoneInset, dispatch } = useApp()
  const { mapSize, isMapReady } = useMap()
  const { eventBus, hints, mapFocus, announce } = useService()

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

  // Nothing on the map can be used until it has loaded
  useKeyboardShortcuts(layoutRefs.viewportRef, { isEnabled: !isMapLoading })

  useMapEvents({
    [events.MAP_CLICK]: () => mapProvider?.clearHighlightedLabel?.()
  })

  const { handleFocus, handleBlur } = useKeyboardHint({
    containerRef: layoutRefs.viewportRef,
    onViewportFocusChange: (visible) => {
      if (!visible) {
        hints.dismiss()
        return
      }
      // Held back while loading, as the shortcuts it mentions are off
      if (!isMapLoading) {
        hints.show(keyboardHintText, { duration: 0 })
      }
    }
  })

  // When loading ends with focus on the map, say so, or that the map may not
  // have loaded if it took too long. Keyboard users get the held-back hint too,
  // in one announcement so neither drowns out the other.
  const wasMapLoadingRef = useRef(isMapLoading)
  useEffect(() => {
    const wasMapLoading = wasMapLoadingRef.current
    wasMapLoadingRef.current = isMapLoading
    if (!wasMapLoading || isMapLoading || document.activeElement !== layoutRefs.viewportRef.current) {
      return
    }
    const message = mapLoading?.hasTimedOut() ? mapLoadingTimeoutText : mapLoadedText
    if (getInterfaceType() === 'keyboard') {
      hints.show(keyboardHintText, { duration: 0, announce: `${message}. ${stripHtml(keyboardHintText)}` })
    } else {
      announce(message)
    }
  }, [isMapLoading])

  // Set before the mount focus below, so the first focus reads the full name
  useLayoutEffect(() => {
    mapFocus.setLabel(isMapLoading ? `${mapLabel}. ${mapLoadingText}` : mapLabel)
  }, [mapLabel, mapLoadingText, isMapLoading])

  // Focus the viewport on mount when opened by a genuine launcher click (see InteractiveMap.js's _handleButtonClick), never on an auto-load or resize.
  useEffect(() => {
    if (focusOnMount) {
      layoutRefs.viewportRef?.current.focus()
    }
  }, [])

  return (
    <>
      <MapController mapContainerRef={mapContainerRef} />
      <div // NOSONAR - role="application" is interactive: the map handles its own keyboard and pointer input
        id={`${id}-viewport`}
        className={`im-c-viewport im-c-viewport--${mapSize}`}
        role='application'
        tabIndex='0' // nosonar
        data-map-keyboard-scope
        onFocus={handleFocus}
        onBlur={(event) => { handleBlur(event); mapFocus.clear() }}
        onKeyDown={() => mapFocus.releaseAnnouncements()}
        onPointerDown={() => mapFocus.releaseAnnouncements()}
        ref={layoutRefs.viewportRef}
        aria-describedby={`${id}-keyboard-desc`}
        aria-controls={`${id}-spatial-list`}
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
      <SpatialList ref={spatialListRef} activeItemId={activeItemId} tabbableId={tabbableId} selectedIds={selectedIds} multiselectable={multiselectable} items={spatialListItems} label={spatialListLabel} focusable={spatialListFocusable} isInert={isMapLoading} onFocus={onSpatialListFocus} onBlur={onSpatialListBlur} onSelectItem={selectItem} />
    </>
  )
}
