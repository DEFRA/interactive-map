import { useEffect, useRef, useState } from 'react'
import { useMarkers } from '../../hooks/useMarkersAPI.js'
import { useConfig } from '../../store/configContext.js'
import { useMap } from '../../store/mapContext.js'
import { useService } from '../../store/serviceContext.js'
import { stringToKebab } from '../../../utils/stringToKebab.js'
import { scaleFactor } from '../../../config/appConfig.js'
import { isStandaloneLabel } from '../../../utils/symbolUtils.js'

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

const renderStandaloneLabel = (marker, mapId, markerRef) => (
  <div
    key={marker.id}
    ref={markerRef(marker.id)}
    id={`${mapId}-marker-${marker.id}`}
    className='im-c-marker-wrapper im-c-marker-wrapper--label'
    style={{ display: marker.isVisible ? 'block' : 'none' }}
  >
    <div
      role='note'
      className='im-c-marker__label im-c-marker__label--standalone'
    >
      {marker.label}
    </div>
  </div>
)

const renderMarkerWithLabel = (marker, mapId, markerRef, isSelected, { resolvedSvg, viewBox, anchor, shapeId, scaledWidth, scaledHeight }) => (
  <div
    key={marker.id}
    ref={markerRef(marker.id)}
    id={`${mapId}-marker-${marker.id}`}
    className={[
      'im-c-marker-wrapper',
      `im-c-marker-wrapper--${stringToKebab(shapeId)}`,
      isSelected && 'im-c-marker-wrapper--selected'
    ].filter(Boolean).join(' ')}
    style={{
      display: marker.isVisible ? 'block' : 'none',
      marginLeft: `${-anchor[0] * scaledWidth}px`,
      marginTop: `${-anchor[1] * scaledHeight}px`,
      width: `${scaledWidth}px`,
      height: `${scaledHeight}px`
    }}
  >
    <svg
      className={[
        'im-c-marker__svg',
        `im-c-marker--${stringToKebab(shapeId)}`,
        isSelected && 'im-c-marker--selected'
      ].filter(Boolean).join(' ')}
      width={scaledWidth}
      height={scaledHeight}
      viewBox={viewBox}
      overflow='visible'
      aria-hidden='true'
    >
      <g dangerouslySetInnerHTML={{ __html: resolvedSvg }} />
    </svg>
    <div role='note' className='im-c-marker__label'>
      {marker.label}
    </div>
  </div>
)

const renderSvgMarker = (marker, mapId, markerRef, isSelected, { resolvedSvg, viewBox, anchor, shapeId, scaledWidth, scaledHeight }) => (
  <svg // NOSONAR: role='img' with aria-label is the correct ARIA pattern for SVG icons; <img> is not appropriate here
    key={marker.id}
    ref={markerRef(marker.id)}
    id={`${mapId}-marker-${marker.id}`}
    className={[
      'im-c-marker',
      `im-c-marker--${stringToKebab(shapeId)}`,
      isSelected && 'im-c-marker--selected'
    ].filter(Boolean).join(' ')}
    width={scaledWidth}
    height={scaledHeight}
    viewBox={viewBox}
    overflow='visible'
    role='img'
    aria-label={marker.label || 'Map marker'}
    style={{
      display: marker.isVisible ? 'block' : 'none',
      marginLeft: `${-anchor[0] * scaledWidth}px`,
      marginTop: `${-anchor[1] * scaledHeight}px`
    }}
  >
    <g dangerouslySetInnerHTML={{ __html: resolvedSvg }} />
  </svg>
)

/**
 * When the interact plugin is active, watch mousemove to set cursor:pointer whenever
 * the mouse is over one of the marker elements (which are pointer-events:none).
 * Standalone labels are excluded — they are not selectable.
 */
const useMarkerCursor = (markers, interactActive, viewportRef) => {
  useEffect(() => {
    if (!interactActive) {
      return undefined
    }
    const viewport = viewportRef.current
    if (!viewport) {
      return undefined
    }
    const onMove = (e) => {
      const hit = markers.items.some(marker => {
        if (isStandaloneLabel(marker)) {
          return false
        }
        const el = markers.markerRefs?.get(marker.id)
        if (!el) {
          return false
        }
        const { left, top, right, bottom } = el.getBoundingClientRect()
        return e.clientX >= left && e.clientX <= right && e.clientY >= top && e.clientY <= bottom
      })
      viewport.style.cursor = hit ? 'pointer' : ''
    }
    viewport.addEventListener('mousemove', onMove)
    return () => {
      viewport.removeEventListener('mousemove', onMove)
      viewport.style.cursor = ''
    }
  }, [markers, interactActive, viewportRef])
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
    <div className='im-c-markers'>
      {markers.items.map(marker => {
        if (isStandaloneLabel(marker)) {
          return renderStandaloneLabel(marker, id, markerRef)
        }
        const isSelected = selectedMarkers.includes(marker.id)
        const symbolProps = resolveSymbolProps(marker, defaults, symbolRegistry, mapStyle, mapSize, isSelected)
        const showLabel = marker.showLabel ?? false
        if (showLabel && marker.label) {
          return renderMarkerWithLabel(marker, id, markerRef, isSelected, symbolProps)
        }
        return renderSvgMarker(marker, id, markerRef, isSelected, symbolProps)
      })}
    </div>
  )
}
