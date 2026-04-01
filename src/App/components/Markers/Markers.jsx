import { useMarkers } from '../../hooks/useMarkersAPI.js'
import { useConfig } from '../../store/configContext.js'
import { useMap } from '../../store/mapContext.js'
import { useService } from '../../store/serviceContext.js'
import { stringToKebab } from '../../../utils/stringToKebab.js'

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Markers = () => {
  const { id } = useConfig()
  const { mapStyle } = useMap()
  const { markers, markerRef } = useMarkers()
  const { symbolRegistry } = useService()

  if (!mapStyle) {
    return undefined
  }

  const defaults = symbolRegistry.getDefaults()

  return (
    <>
      {markers.items.map(marker => {
        // Inline symbolSvgContent takes precedence over a registered symbol,
        // cascading through marker → constructor defaults
        const symbolDef = (marker.symbolSvgContent || defaults.symbolSvgContent)
          ? { svg: marker.symbolSvgContent || defaults.symbolSvgContent }
          : symbolRegistry.get(marker.symbol || defaults.symbol)

        // selectedColor comes from mapStyle — not per-marker; selectedWidth stays in cascade
        const INTERNAL_KEYS = new Set(['id', 'coords', 'x', 'y', 'isVisible', 'symbol', 'symbolSvgContent', 'viewBox', 'anchor', 'selectedColor', 'selectedWidth'])
        const styleValues = Object.fromEntries(
          Object.entries(marker).filter(([k]) => !INTERNAL_KEYS.has(k))
        )
        const resolvedSvg = symbolRegistry.resolve(symbolDef, styleValues, mapStyle)

        const viewBox = marker.viewBox || defaults.viewBox || symbolDef?.viewBox || '0 0 38 38'
        const [,, svgWidth, svgHeight] = viewBox.split(' ').map(Number)
        const anchor = marker.anchor ?? defaults.anchor ?? symbolDef?.anchor ?? [0.5, 0.5]
        const shapeId = marker.symbol || defaults.symbol

        return (
          <svg
            key={marker.id}
            ref={markerRef(marker.id)}
            id={`${id}-marker-${marker.id}`}
            className={`im-c-marker im-c-marker--${stringToKebab(shapeId)}`}
            width={svgWidth}
            height={svgHeight}
            viewBox={viewBox}
            overflow='visible'
            style={{
              display: marker.isVisible ? 'block' : 'none',
              marginLeft: `${-anchor[0] * svgWidth}px`,
              marginTop: `${-anchor[1] * svgHeight}px`
            }}
          >
            <g dangerouslySetInnerHTML={{ __html: resolvedSvg }} />
          </svg>
        )
      })}
    </>
  )
}
