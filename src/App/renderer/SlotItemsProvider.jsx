// src/core/renderers/SlotItemsProvider.jsx
import React, { createContext, useContext } from 'react'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { getItemsBySlot } from './slotAggregator.js'
import { useEvaluateProp } from '../hooks/useEvaluateProp.js'
import { useApplicationModeFilter } from '../hooks/useApplicationModeFilter.js'

const SlotItemsContext = createContext(new Map())

/**
 * Builds every slot's items once per render and shares them with each SlotRenderer below it.
 * Kept separate from Layout so that a plugin state change re-renders only this provider and the
 * slots, not the rest of the layout.
 */
export const SlotItemsProvider = ({ children }) => {
  const appConfig = useConfig()
  const appState = useApp()
  const evaluateProp = useEvaluateProp()
  const isHiddenByApplicationMode = useApplicationModeFilter()

  const itemsBySlot = getItemsBySlot({ appConfig, appState, evaluateProp, isHiddenByApplicationMode })

  return (
    <SlotItemsContext.Provider value={itemsBySlot}>
      {children}
    </SlotItemsContext.Provider>
  )
}

const noItems = []

export const useSlotItems = (slot) => useContext(SlotItemsContext).get(slot) ?? noItems
