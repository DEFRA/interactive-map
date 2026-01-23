import React from 'react'
import { textSizeSvgPath } from './config.js'
import { scaleFactor } from '../../../src/config/appConfig.js'

export const MapStyles = ({ mapState, pluginConfig, services, mapProvider }) => {
  const { mapStyle: currentMapStyle, mapSize: currentMapSize } = mapState
  const { mapStyles } = pluginConfig
  const { events, eventBus } = services
  const { supportsMapSizes } = mapProvider.capabilities

  const handleMapStyleClick = (newMapStyle) => {
    eventBus.emit(events.MAP_SET_STYLE, newMapStyle)
  }

  const handleMapSizeClick = (newMapSize) => {
    eventBus.emit(events.MAP_SET_SIZE, newMapSize)
    eventBus.emit(events.MAP_SET_PIXEL_RATIO, window.devicePixelRatio * scaleFactor[newMapSize])
  }

  return (
    <div className='im-c-map-styles'>
      <div className='im-c-map-styles__group'>
        <div className='im-c-map-styles__inner'>
          {mapStyles.filter(mapStyle => mapStyle.url).map(mapStyle => (
            <div className='im-c-map-styles__item' key={mapStyle.id}>
              <button className='im-c-map-styles__button' aria-pressed={mapStyle.id === currentMapStyle.id} onClick={() => handleMapStyleClick(mapStyle)}>
                <div className='im-c-map-styles__image'>
                  <img src={mapStyle.thumbnail || undefined} height='60' width='60' />
                </div>
                {mapStyle.label}
              </button>
            </div>
          ))}
        </div>
      </div>
      {supportsMapSizes && (
        <div className='im-c-map-styles__group'>
          <h3 className='im-c-map-styles__heading' id='map-text-sizes'>Map size</h3>
          <div className='im-c-map-styles__inner'>
            {['small', 'medium', 'large'].map(size => (
              <div className='im-c-map-styles__item' key={size}>
                <button className='im-c-map-styles__button' onClick={() => handleMapSizeClick(size)} aria-pressed={size === currentMapSize}>
                  <div className='im-c-map-styles__image'>
                    <svg width='60' height='60' viewBox='0 0 60 60' fillRule='evenodd'>
                      <rect className='im-c-map-styles__image-bg' width='100%' height='100%' />
                      <g style={{ transform: `scale(${scaleFactor[size]})`, transformOrigin: '8px 52px' }}>
                        <path d={textSizeSvgPath} />
                      </g>
                    </svg>
                  </div>
                  {size[0].toUpperCase() + size.slice(1)}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
