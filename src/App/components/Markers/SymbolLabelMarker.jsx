import { stringToKebab } from '../../../utils/stringToKebab.js'

const SymbolLabelMarker = ({ marker, mapId, markerRef, isSelected, symbolProps }) => { // NOSONAR: project does not use PropTypes
  const { resolvedSvg, viewBox, anchor, shapeId, scaledWidth, scaledHeight } = symbolProps
  return (
    <div
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
}

export default SymbolLabelMarker
