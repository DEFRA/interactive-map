// src/core/renderers/SlotRenderer.jsx
import React from 'react'
import { useSlotItems } from './SlotItemsProvider.jsx'
import { Actions } from '../components/Actions/Actions.jsx'

export const SlotRenderer = ({ slot }) => {
  // Built for every slot at once by SlotItemsProvider
  const slotItems = useSlotItems(slot)

  if (!slotItems.length) {
    return null
  }

  return (
    <>
      {slot === 'actions'
        ? (
          <Actions slot='actions'>
            {slotItems.map(item => item.element)}
          </Actions>
          )
        : (
          <>
            {slotItems.map(item => item.element)}
          </>
          )}
    </>
  )
}
