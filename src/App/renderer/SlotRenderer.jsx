// src/core/renderers/SlotRenderer.jsx
import React from 'react'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { getSlotItems } from './slotAggregator.js'
import { Actions } from '../components/Actions/Actions.jsx'
import { useEvaluateProp } from '../hooks/useEvaluateProp.js'

export const SlotRenderer = ({ slot }) => {
  const appConfig = useConfig()
  const appState = useApp()

  // Shared evaluateProp hook for this render cycle
  const evaluateProp = useEvaluateProp()

  // Get all slot items (controls, panels, buttons)
  const slotItems = getSlotItems({ slot, appConfig, appState, evaluateProp })

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
