// src/core/renderers/slotAggregator.js
import { mapControls } from './mapControls.js'
import { mapPanels } from './mapPanels.js'
import { mapButtons } from './mapButtons.js'
import { orderItems } from './orderItems.js'

// args include isHiddenByApplicationMode (see useApplicationModeFilter), so every renderer asks the
// same precomputed application mode rules whether to hide each of its items
export function getSlotItems (args) {
  const controls = mapControls(args)
  const panels = mapPanels(args)
  const buttons = mapButtons(args)

  return orderItems([...controls, ...panels, ...buttons])
}
