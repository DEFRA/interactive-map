import { useEffect, useRef, useState } from 'react'
import { useMarkers } from '../../hooks/useMarkersAPI.js'
import { useMarkerCursor } from '../../hooks/useMarkerCursor.js'
import { useConfig } from '../../store/configContext.js'
import { useMap } from '../../store/mapContext.js'
import { useService } from '../../store/serviceContext.js'
import { scaleFactor } from '../../../config/appConfig.js'
import { isStandaloneLabel } from '../../../utils/symbolUtils.js'
import { DEFAULT_SYMBOL_ANCHOR, DEFAULT_SYMBOL_VIEWBOX } from '../../../config/symbolConfig.js'
import { EVENTS } from '../../../config/events.js'
import LabelMarker from './LabelMarker.jsx'
import SymbolLabelMarker from './SymbolLabelMarker.jsx'
import SymbolMarker from './SymbolMarker.jsx'

// Marker properties handled internally — excluded from style value resolution
const INTERNAL_KEYS = new Set(['id', 'coords', 'x', 'y', 'isVisible', 'symbol', 'svgContent', 'size', 'viewBox', 'anchor', 'selectedColor', 'label', 'showLabel'])

// The keyboard cursor's rings take priority over the selected ring
const markerVariant = (isSelected, isActive) => {
  if (isActive) {
    return 'active'
  }
  return isSelected ? 'selected' : 'normal'
}

// The marker's definition carries the viewBox and anchor for its size (see
// symbolRegistry.getMarkerSymbolDef)
const resolveSymbolProps = (marker, defaults, symbolRegistry, mapStyle, mapSize, variant) => {
  const symbolDef = symbolRegistry.getMarkerSymbolDef(marker)
  const styleValues = Object.fromEntries(
    Object.entries(marker).filter(([k]) => !INTERNAL_KEYS.has(k))
  )
  const resolvedSvg = symbolRegistry.resolveVariant(symbolDef, styleValues, mapStyle, variant)
  const viewBox = symbolDef?.viewBox ?? DEFAULT_SYMBOL_VIEWBOX
  const [,, svgWidth, svgHeight] = viewBox.split(' ').map(Number)
  const anchor = symbolDef?.anchor ?? DEFAULT_SYMBOL_ANCHOR
  const shapeId = marker.symbol || defaults.symbol
  const scale = scaleFactor[mapSize] ?? 1
  return { resolvedSvg, viewBox, anchor, shapeId, scaledWidth: svgWidth * scale, scaledHeight: svgHeight * scale }
}

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Markers = () => {
  const { id } = useConfig()
  const { mapStyle, mapSize } = useMap()
  const { markers, markerRef } = useMarkers()
  const { symbolRegistry, eventBus } = useService()

  const [canSelectMarker, setCanSelectMarker] = useState(false)
  const [selectedMarkers, setSelectedMarkers] = useState([])
  const [activeMarkerId, setActiveMarkerId] = useState(null)
  const viewportRef = useRef(null)

  useEffect(() => {
    const handleActive = ({ active, interactionModes = [] }) => setCanSelectMarker(active && interactionModes.includes('selectMarker'))
    const handleSelectionChange = ({ selectedMarkers: next = [] }) => setSelectedMarkers(next)
    const handleSetActive = ({ id: markerId }) => setActiveMarkerId(markerId)
    eventBus.on('interact:active', handleActive)
    eventBus.on('interact:selectionchange', handleSelectionChange)
    eventBus.on(EVENTS.MAP_SET_ACTIVE_ITEM, handleSetActive)
    return () => {
      eventBus.off('interact:active', handleActive)
      eventBus.off('interact:selectionchange', handleSelectionChange)
      eventBus.off(EVENTS.MAP_SET_ACTIVE_ITEM, handleSetActive)
    }
  }, [eventBus])

  // Resolve viewport element once on mount for cursor tracking
  useEffect(() => {
    viewportRef.current = document.querySelector('.im-c-viewport')
  }, [])

  useMarkerCursor(markers, canSelectMarker, viewportRef)

  if (!mapStyle) {
    return undefined
  }

  const defaults = symbolRegistry.getDefaults()

  return (
    <>
      {markers.items.map(marker => {
        const isSelected = selectedMarkers.includes(marker.id)
        const isActive = marker.id === activeMarkerId

        if (isStandaloneLabel(marker)) {
          return <LabelMarker key={marker.id} marker={marker} mapId={id} markerRef={markerRef} />
        }

        const symbolProps = resolveSymbolProps(marker, defaults, symbolRegistry, mapStyle, mapSize, markerVariant(isSelected, isActive))

        if (marker.showLabel && marker.label) {
          return <SymbolLabelMarker key={marker.id} marker={marker} mapId={id} markerRef={markerRef} isSelected={isSelected} symbolProps={symbolProps} />
        }

        return <SymbolMarker key={marker.id} marker={marker} mapId={id} markerRef={markerRef} isSelected={isSelected} symbolProps={symbolProps} />
      })}
    </>
  )
}
