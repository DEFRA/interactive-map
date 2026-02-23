import React from 'react'
import { useMap } from '../../store/mapContext'

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Logo = () => {
  const { mapStyle } = useMap()

  if (!mapStyle?.logo) {
    return undefined
  }

  return (
    <img className='im-c-logo' src={mapStyle.logo} alt={mapStyle.logoAltText} />
  )
}
