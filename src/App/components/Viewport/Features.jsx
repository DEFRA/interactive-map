import React, { forwardRef } from 'react'
import { useConfig } from '../../store/configContext.js'
import { Markers } from '../Markers/Markers'

export const Features = forwardRef(({ activeFeatureId }, ref) => {
  const { id } = useConfig()
  return (
    <ul // NOSONAR: role='listbox' is correct for a custom composite widget; native <select> cannot host SVG marker elements
      id={`${id}-features`}
      ref={ref}
      role='listbox' // NOSONAR
      tabIndex='-1'
      aria-label='Map features'
      aria-activedescendant={activeFeatureId || undefined}
      className='im-c-features'
    >
      <Markers />
    </ul>
  )
})

Features.displayName = 'Features'
