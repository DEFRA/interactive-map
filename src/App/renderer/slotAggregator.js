// src/core/renderers/slotAggregator.js
import { mapControls } from './mapControls.js'
import { mapPanels } from './mapPanels.js'
import { mapButtons } from './mapButtons.js'
import { orderItems } from './orderItems.js'
import { groupBySlot } from './slotHelpers.js'

/**
 * Builds the items for every slot in one pass, so each item's excludeWhen runs once per render
 * rather than once per slot. Includes the nested `<buttonId>-button` slots; controls in a
 * `<panelId>-panel` slot are rendered by their panel's body.
 *
 * args include isHiddenByApplicationMode (see useApplicationModeFilter), so every mapper asks the
 * same precomputed application mode rules whether to hide each of its items.
 *
 * @returns {Map<string, object[]>} each slot's ordered items; slots with no items are absent
 */
export function getItemsBySlot (args) {
  const controls = mapControls(args)
  const panels = mapPanels({ ...args, controlsBySlot: groupBySlot(controls) })
  const buttons = mapButtons(args)

  const bySlot = groupBySlot([...controls, ...panels, ...buttons])
  for (const [slot, items] of bySlot) {
    bySlot.set(slot, orderItems(items))
  }
  return bySlot
}
