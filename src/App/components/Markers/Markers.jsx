import { markerSvgPaths } from '../../../config/appConfig.js'
import { useMarkers } from '../../hooks/useMarkersAPI.js'
import { useConfig } from '../../store/configContext.js'
import { useMap } from '../../store/mapContext.js'
import { getValueForStyle } from '../../../utils/getValueForStyle.js'
import { stringToKebab } from '../../../utils/stringToKebab.js'

export const Markers = () => {
  const { id, markerShape, markerColor } = useConfig()
  const { mapStyle } = useMap()
  const { markers, markerRef } = useMarkers()

  if (!mapStyle) {
    return
  }

  const defaultSvgPaths = markerSvgPaths.find(m => m.shape === markerShape)

  return (
    <>
      {markers.items.map(marker => (
        <svg
          key={marker.id}
          ref={markerRef(marker.id)} // Single callback ref, just like useCrossHair
          id={`${id}-marker-${marker.id}`}
          className={`im-c-marker im-c-marker--${marker.markerShape || stringToKebab(markerShape)}`}
          width='38'
          height='38'
          viewBox='0 0 38 38'
          style={{ display: marker.isVisible ? 'block' : 'none' }}
        >
          <path
            className='im-c-marker__background'
            d={defaultSvgPaths.backgroundPath}
            fill={getValueForStyle(marker.color || markerColor, mapStyle.id)}
          />
          <path
            className='im-c-marker__graphic'
            d={defaultSvgPaths.graphicPath}
          />
        </svg>
      ))}
    </>
  )
}
