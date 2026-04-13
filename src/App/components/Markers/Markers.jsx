import { useEffect, useRef, useState } from 'react'
import { useMarkers } from '../../hooks/useMarkersAPI.js'
import { useConfig } from '../../store/configContext.js'
import { useMap } from '../../store/mapContext.js'
import { useService } from '../../store/serviceContext.js'
import { stringToKebab } from '../../../utils/stringToKebab.js'
import { scaleFactor } from '../../../config/appConfig.js'

// Marker properties handled internally — excluded from style value resolution
const INTERNAL_KEYS = new Set(['id', 'coords', 'x', 'y', 'isVisible', 'symbol', 'symbolSvgContent', 'viewBox', 'anchor', 'selectedColor', 'selectedWidth'])

const resolveSymbolDef = (marker, defaults, symbolRegistry) => {
  const svgContent = marker.symbolSvgContent || defaults.symbolSvgContent
  // Inline symbolSvgContent takes precedence over a registered symbol,
  // cascading through marker → constructor defaults
  return svgContent
    ? { svg: svgContent }
    : symbolRegistry.get(marker.symbol || defaults.symbol)
}

const resolveViewBox = (marker, defaults, symbolDef) =>
  marker.viewBox || defaults.viewBox || symbolDef?.viewBox || '0 0 38 38'

const resolveAnchor = (marker, defaults, symbolDef) =>
  marker.anchor ?? defaults.anchor ?? symbolDef?.anchor ?? [0.5, 0.5]

/**
 * When the interact plugin is active, watch mousemove to set cursor:pointer whenever
 * the mouse is over one of the marker SVG elements (which are pointer-events:none).
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
    <>
      {markers.items.map(marker => {
        const symbolDef = resolveSymbolDef(marker, defaults, symbolRegistry)
        // selectedColor comes from mapStyle — not per-marker; selectedWidth stays in cascade
        const styleValues = Object.fromEntries(
          Object.entries(marker).filter(([k]) => !INTERNAL_KEYS.has(k))
        )
        const isSelected = selectedMarkers.includes(marker.id)
        const resolvedSvg = isSelected
          ? symbolRegistry.resolveSelected(symbolDef, styleValues, mapStyle)
          : symbolRegistry.resolve(symbolDef, styleValues, mapStyle)

        const viewBox = resolveViewBox(marker, defaults, symbolDef)
        const [,, svgWidth, svgHeight] = viewBox.split(' ').map(Number)
        const anchor = resolveAnchor(marker, defaults, symbolDef)
        const shapeId = marker.symbol || defaults.symbol
        const scale = scaleFactor[mapSize] ?? 1
        const scaledWidth = svgWidth * scale
        const scaledHeight = svgHeight * scale

        return (
          <svg
            key={marker.id}
            ref={markerRef(marker.id)}
            id={`${id}-marker-${marker.id}`}
            className={[
              'im-c-marker',
              `im-c-marker--${stringToKebab(shapeId)}`,
              isSelected && 'im-c-marker--selected'
            ].filter(Boolean).join(' ')}
            width={scaledWidth}
            height={scaledHeight}
            viewBox={viewBox}
            overflow='visible'
            style={{
              display: marker.isVisible ? 'block' : 'none',
              marginLeft: `${-anchor[0] * scaledWidth}px`,
              marginTop: `${-anchor[1] * scaledHeight}px`
            }}
          >
            <g dangerouslySetInnerHTML={{ __html: resolvedSvg }} />
          </svg>
        )
      })}
    </>
  )
}
