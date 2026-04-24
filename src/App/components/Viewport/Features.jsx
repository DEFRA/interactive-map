import React from 'react'
import { Markers } from '../Markers/Markers'

export const Features = () => (
  <ul // NOSONAR: role='listbox' is correct for a custom composite widget; native <select> cannot host SVG marker elements
    role='listbox' // NOSONAR
    tabIndex='-1'
    aria-label='Map features'
    className='im-c-features'
  >
    <Markers />
  </ul>
)
