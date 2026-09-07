import React, { forwardRef } from 'react'
import { useConfig } from '../../store/configContext.js'

export const Features = forwardRef(({ activeFeatureId, tabbableId, selectedIds = [], multiselectable = false, items = [], onFocus, onBlur, onSelectItem }, ref) => {
  const { id } = useConfig()
  const hasItems = items.length > 0
  // Roving tabindex: exactly one option is a Tab stop at a time (the focused item while the
  // list has real focus, otherwise the resting entry position) — see useFeatureFocus.js.
  const currentId = activeFeatureId ?? tabbableId
  return (
    <ul // NOSONAR: role='listbox' is correct for custom composite widget; native <select> cannot host SVG marker elements
      id={`${id}-features`}
      ref={ref}
      role='listbox' // NOSONAR
      aria-hidden={hasItems ? undefined : true}
      aria-label='Map features'
      aria-describedby={`${id}-keyboard-desc`}
      aria-multiselectable={multiselectable || undefined}
      className='im-c-features'
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {items.map(item => (
        <li // NOSONAR: role='option' overrides implicit listitem; this is the correct ARIA listbox child pattern.
          // tabIndex/onClick make each option a real, independently focusable and activatable
          // control — required so touch screen readers and voice control can reach and operate
          // it directly, not just app-managed keyboard-arrow navigation.
          key={item.id} id={`${id}-feature-${item.id}`} role='option' // NOSONAR
          data-id={item.id}
          tabIndex={item.id === currentId ? 0 : -1}
          aria-selected={selectedIds.includes(item.id)}
          // Positions the (visually clipped) option over its on-map feature — item.x/item.y are
          // screen coordinates from the interact plugin (see useMapItemList.js). Without this,
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

Features.displayName = 'Features'
