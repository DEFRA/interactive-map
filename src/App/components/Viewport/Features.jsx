import React, { forwardRef } from 'react'
import { Markers } from '../Markers/Markers'

export const Features = forwardRef(({ activeFeatureId }, ref) => (
  <ul
    ref={ref}
    role='listbox'
    tabIndex='-1'
    aria-label='Map features'
    aria-activedescendant={activeFeatureId || undefined}
    className='im-c-features'
  >
    <Markers />
  </ul>
))

Features.displayName = 'Features'
