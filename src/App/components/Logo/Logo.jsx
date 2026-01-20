import React from 'react'
import { useMap } from '../../store/mapContext'

export const Logo = () => {
  const { mapStyle } = useMap()

  if (!mapStyle?.logo) {
    return
  }

  return (
    <img className='im-c-logo' src={mapStyle.logo} alt={mapStyle.logoAltText} />
  )
}
