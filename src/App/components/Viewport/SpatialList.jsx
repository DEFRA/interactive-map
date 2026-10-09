import React, { forwardRef } from 'react'
import { useConfig } from '../../store/configContext.js'

// Accessible spatial list: a listbox whose items are positioned to match wherever they are on
// the map, navigable both sequentially (Arrow/Home/End) and spatially (Alt+Arrow — see
// useSpatialListFocus.js). Content is whatever the current spatialListRegistry provider
// contributes; `label` names it for aria-label accordingly.
export const SpatialList = forwardRef(({ activeItemId, tabbableId, selectedIds = [], multiselectable = false, items = [], label = 'Map features', focusable = true, onFocus, onBlur, onSelectItem }, ref) => {
  const { id } = useConfig()
  const hasItems = items.length > 0
  // Roving tabindex: exactly one option is a Tab stop at a time — see useSpatialListFocus.js.
  const currentId = activeItemId ?? tabbableId
  return (
    <ul // NOSONAR: role='listbox' is correct for custom composite widget; native <select> cannot host SVG marker elements
      id={`${id}-spatial-list`}
      ref={ref}
      role='listbox' // NOSONAR
      aria-hidden={hasItems ? undefined : true}
      aria-label={label}
      aria-describedby={`${id}-keyboard-desc`}
      aria-multiselectable={multiselectable || undefined}
      className='im-c-spatial-list'
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {items.map(item => (
        <li // NOSONAR: role='option' overrides implicit listitem; this is the correct ARIA listbox child pattern.
          // tabIndex/onClick let voice control and screen readers reach and activate each option
          // directly. focusable: false (draw's vertex/midpoint items) keeps every item out of
          // the Tab order — that population already has a full keyboard path via the map itself.
          key={item.id} id={`${id}-spatial-list-item-${item.id}`} role='option' // NOSONAR
          data-id={item.id}
          tabIndex={focusable && item.id === currentId ? 0 : -1}
          aria-selected={selectedIds.includes(item.id)}
          // Positions the (visually clipped) option over its on-map feature, so AT overlays like
          // Voice Control's "Show Numbers" number it at the right screen position.
          style={item.x != null ? { left: item.x, top: item.y } : undefined}
          onClick={() => onSelectItem?.(item.id)}
        >
          {item.label}
        </li>
      ))}
    </ul>
  )
})

SpatialList.displayName = 'SpatialList'
