import React from 'react'
import { useApp } from '../../store/appContext'
import { useMap } from '../../store/mapContext'

export const Attributions = () => {
  const { breakpoint } = useApp()
  const { mapStyle } = useMap()

  if (!mapStyle) {
    return
  }

  return (
    breakpoint !== 'mobile' && (
      <div className='im-c-attributions' dangerouslySetInnerHTML={{ __html: mapStyle.attribution }} />
    )
  )
}
