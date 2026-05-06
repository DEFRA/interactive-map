import React, { forwardRef } from 'react'
import { useConfig } from '../../store/configContext.js'

export const Features = forwardRef(({ activeFeatureId, selectedIds = [], multiselectable = false, items = [], onFocus, onBlur }, ref) => {
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
      aria-describedby={`${id}-keyboard-desc`}
      aria-multiselectable={multiselectable || undefined}
      aria-activedescendant={activeFeatureId ? `${id}-feature-${activeFeatureId}` : undefined}
      className='im-c-features'
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {items.map(item => (
        <li // NOSONAR: role='option' overrides implicit listitem; this is the correct ARIA listbox child pattern
          key={item.id} id={`${id}-feature-${item.id}`} role='option' // NOSONAR
          data-id={item.id}
          aria-selected={selectedIds.includes(item.id)}
        >
          {item.label}
        </li>
      ))}
    </ul>
  )
})

Features.displayName = 'Features'
