const LabelMarker = ({ marker, mapId, markerRef }) => ( // NOSONAR: project does not use PropTypes
  <div
    ref={markerRef(marker.id)}
    id={`${mapId}-marker-${marker.id}`}
    className='im-c-marker-wrapper im-c-marker-wrapper--label'
    style={{ display: marker.isVisible ? 'block' : 'none' }}
  >
    <div role='note' className='im-c-marker__label im-c-marker__label--standalone'>
      {marker.label}
    </div>
  </div>
)

export default LabelMarker
