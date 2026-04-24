import { stringToKebab } from '../../../utils/stringToKebab.js'

const SymbolMarker = ({ marker, mapId, markerRef, isSelected, symbolProps }) => { // NOSONAR: project does not use PropTypes
  const { resolvedSvg, viewBox, anchor, shapeId, scaledWidth, scaledHeight } = symbolProps
  return (
    <svg // NOSONAR: role='img' with aria-label is the correct ARIA pattern for SVG icons; <img> is not appropriate here
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
}

export default SymbolMarker
