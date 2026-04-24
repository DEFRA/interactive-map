import { useEffect, useRef, useState } from 'react'
import { useMarkers } from '../../hooks/useMarkersAPI.js'
import { useMarkerCursor } from '../../hooks/useMarkerCursor.js'
import { useConfig } from '../../store/configContext.js'
import { useMap } from '../../store/mapContext.js'
import { useService } from '../../store/serviceContext.js'
import { scaleFactor } from '../../../config/appConfig.js'
import { isStandaloneLabel } from '../../../utils/symbolUtils.js'
import MarkerItem from './MarkerItem.jsx'
import LabelMarker from './LabelMarker.jsx'
import SymbolLabelMarker from './SymbolLabelMarker.jsx'
import SymbolMarker from './SymbolMarker.jsx'

// Marker properties handled internally — excluded from style value resolution
const INTERNAL_KEYS = new Set(['id', 'coords', 'x', 'y', 'isVisible', 'symbol', 'symbolSvgContent', 'viewBox', 'anchor', 'selectedColor', 'selectedWidth', 'label', 'showLabel'])

const resolveSymbolDef = (marker, defaults, symbolRegistry) => {
  const svgContent = marker.symbolSvgContent || defaults.symbolSvgContent
  return svgContent
    ? { svg: svgContent }
    : symbolRegistry.get(marker.symbol || defaults.symbol)
}

const resolveViewBox = (marker, defaults, symbolDef) =>
  marker.viewBox || defaults.viewBox || symbolDef?.viewBox || '0 0 38 38'

const resolveAnchor = (marker, defaults, symbolDef) =>
  marker.anchor ?? defaults.anchor ?? symbolDef?.anchor ?? [0.5, 0.5]

const resolveSymbolProps = (marker, defaults, symbolRegistry, mapStyle, mapSize, isSelected) => {
  const symbolDef = resolveSymbolDef(marker, defaults, symbolRegistry)
  const styleValues = Object.fromEntries(
    Object.entries(marker).filter(([k]) => !INTERNAL_KEYS.has(k))
  )
  const resolvedSvg = isSelected
    ? symbolRegistry.resolveSelected(symbolDef, styleValues, mapStyle)
    : symbolRegistry.resolve(symbolDef, styleValues, mapStyle)
  const viewBox = resolveViewBox(marker, defaults, symbolDef)
  const [,, svgWidth, svgHeight] = viewBox.split(' ').map(Number)
  const anchor = resolveAnchor(marker, defaults, symbolDef)
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
  const viewportRef = useRef(null)

  useEffect(() => {
    const handleActive = ({ active, interactionModes = [] }) => setCanSelectMarker(active && interactionModes.includes('selectMarker'))
    const handleSelectionChange = ({ selectedMarkers: next = [] }) => setSelectedMarkers(next)
    eventBus.on('interact:active', handleActive)
    eventBus.on('interact:selectionchange', handleSelectionChange)
    return () => {
      eventBus.off('interact:active', handleActive)
      eventBus.off('interact:selectionchange', handleSelectionChange)
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
        const featureId = `${id}-feature-${marker.id}`

        if (isStandaloneLabel(marker)) {
          return (
            <MarkerItem key={marker.id} id={featureId} isSelected={false}>
              <LabelMarker marker={marker} mapId={id} markerRef={markerRef} />
            </MarkerItem>
          )
        }

        const symbolProps = resolveSymbolProps(marker, defaults, symbolRegistry, mapStyle, mapSize, isSelected)

        if (marker.showLabel && marker.label) {
          return (
            <MarkerItem key={marker.id} id={featureId} isSelected={isSelected}>
              <SymbolLabelMarker marker={marker} mapId={id} markerRef={markerRef} isSelected={isSelected} symbolProps={symbolProps} />
            </MarkerItem>
          )
        }

        return (
          <MarkerItem key={marker.id} id={featureId} isSelected={isSelected}>
            <SymbolMarker marker={marker} mapId={id} markerRef={markerRef} isSelected={isSelected} symbolProps={symbolProps} />
          </MarkerItem>
        )
      })}
    </>
  )
}
