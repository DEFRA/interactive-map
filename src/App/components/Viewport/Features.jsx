import React, { forwardRef } from 'react'
import { useConfig } from '../../store/configContext.js'

export const Features = forwardRef(({ activeFeatureId, items = [], onFocus }, ref) => {
  const { id } = useConfig()
  const hasItems = items.length > 0
  return (
    <ul // NOSONAR: role='listbox' is correct for custom composite widget; native <select> cannot host SVG marker elements
      id={`${id}-features`}
      ref={ref}
      role='listbox' // NOSONAR
      tabIndex={hasItems ? '0' : '-1'}
      aria-hidden={hasItems ? undefined : true}
      aria-label='Map features'
      aria-activedescendant={activeFeatureId || undefined}
      className='im-c-features'
      onFocus={onFocus}
    >
      {items.map(item => (
        <li // NOSONAR: role='option' overrides implicit listitem; this is the correct ARIA listbox child pattern
          key={item.id} id={`${id}-feature-${item.id}`} role='option' // NOSONAR
          aria-selected={activeFeatureId === item.id}
        >
          {item.label}
        </li>
      ))}
    </ul>
  )
})

Features.displayName = 'Features'
