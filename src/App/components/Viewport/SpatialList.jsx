import React, { forwardRef } from 'react'
import { useConfig } from '../../store/configContext.js'

// Accessible spatial list: a listbox whose items are positioned to match wherever they are on
// the map, navigable both sequentially (Arrow/Home/End) and spatially (Alt+Arrow — see
// useSpatialListFocus.js). Content is whatever the current spatialListRegistry provider(s)
// contribute — map features/markers (interact) today, draw's edit-mode vertices in future —
// not tied to any one of them; `label` (from that same provider, see useSpatialListItems.js)
// is what makes the aria-label describe whichever one is actually populating it right now.
export const SpatialList = forwardRef(({ activeItemId, tabbableId, selectedIds = [], multiselectable = false, items = [], label = 'Map features', onFocus, onBlur, onSelectItem }, ref) => {
  const { id } = useConfig()
  const hasItems = items.length > 0
  // Roving tabindex: exactly one option is a Tab stop at a time (the focused item while the
  // list has real focus, otherwise the resting entry position) — see useSpatialListFocus.js.
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
          // tabIndex/onClick make each option a real, independently focusable and activatable
          // control — required so touch screen readers and voice control can reach and operate
          // it directly, not just app-managed keyboard-arrow navigation.
          key={item.id} id={`${id}-spatial-list-item-${item.id}`} role='option' // NOSONAR
          data-id={item.id}
          tabIndex={item.id === currentId ? 0 : -1}
          aria-selected={selectedIds.includes(item.id)}
          // Positions the (visually clipped) option over its on-map feature — item.x/item.y are
          // screen coordinates from the interact plugin (see useSpatialList.js). Without this,
          // every option collapses to the CSS static-position default (~top-left of the
          // viewport), which is invisible to sighted users but misaligns coordinate-based AT
          // overlays, e.g. macOS Voice Control's "Show Numbers", which numbers items at their
          // real position on screen. Items without a resolved position (not yet supported for
          // dataset/polygon features) fall back to that same default.
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
