// src/core/components/Viewport/MapStatus.jsx
import React from 'react'
import { useService } from '../../store/serviceContext'

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const MapStatus = () => {
  const { mapStatusRef } = useService()

  return (
    <div
      ref={mapStatusRef}
      role='status'
      className='im-c-viewport__status'
      aria-live='polite'
      aria-atomic='true'
      // aria-relevant="additions"
      aria-label='Map updates'
    />
  )
}
