import React from 'react'
import { getIconRegistry } from '../../registry/iconRegistry.js'

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Icon = ({ id, svgContent }) => {
  const icon = getIconRegistry()[id] || svgContent

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
      focusable='false'
      dangerouslySetInnerHTML={{ __html: icon }}
    />
  )
}
