import { useMarkers } from '../../hooks/useMarkersAPI.js'
import { useConfig } from '../../store/configContext.js'
import { useMap } from '../../store/mapContext.js'
import { useService } from '../../store/serviceContext.js'
import { stringToKebab } from '../../../utils/stringToKebab.js'

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Markers = () => {
  const { id, markerSymbol } = useConfig()
  const { mapStyle } = useMap()
  const { markers, markerRef } = useMarkers()
  const { symbolRegistry } = useService()

  if (!mapStyle) {
    return undefined
  }

  return (
    <>
      {markers.items.map(marker => {
        // Inline symbolSvgContent takes precedence over a registered symbol
        const symbolDef = marker.symbolSvgContent
          ? { svg: marker.symbolSvgContent }
          : symbolRegistry.get(marker.symbol || markerSymbol)

        // Pass all marker props through as token overrides — structural keys excluded
        const INTERNAL_KEYS = new Set(['id', 'coords', 'x', 'y', 'isVisible', 'symbol', 'symbolSvgContent', 'viewBox', 'anchor'])
        const styleValues = Object.fromEntries(
          Object.entries(marker).filter(([k]) => !INTERNAL_KEYS.has(k))
        )
        const resolvedSvg = symbolRegistry.resolve(symbolDef, styleValues, mapStyle.id)

        const viewBox = marker.viewBox || symbolDef?.viewBox || '0 0 38 38'
        const [,, svgWidth, svgHeight] = viewBox.split(' ').map(Number)
        const anchor = marker.anchor ?? symbolDef?.anchor ?? [0.5, 0.5]

        return (
          <svg
            key={marker.id}
            ref={markerRef(marker.id)}
            id={`${id}-marker-${marker.id}`}
            className={`im-c-marker im-c-marker--${stringToKebab(marker.symbol || markerSymbol)}`}
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
