import React from 'react'
import { useApp } from '../../store/appContext'
import { useMap } from '../../store/mapContext'

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Attributions = () => {
  const { breakpoint } = useApp()
  const { mapStyle } = useMap()

  if (!mapStyle) {
    return null
  }

  return (
    breakpoint !== 'mobile' && (
      <div className='im-c-attributions' dangerouslySetInnerHTML={{ __html: mapStyle.attribution }} />
    )
  )
}
