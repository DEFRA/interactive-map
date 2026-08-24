// src/core/renderers/orderItems.js

/**
 * Orders a list of `{ id, order, element }` items for a single render target
 * (a layout slot, or a panel body).
 *
 * Items without an explicit `order` (or `order === 0`) keep their natural/registration
 * sequence. Items with an explicit `order` are spliced into that 1-based position among
 * the unordered items, clamped to the valid range.
 */
export function orderItems (items) {
  // Start with items that have no explicit order (in their natural sequence)
  const withoutOrder = items.filter(item => item.order == null || item.order === 0)
  const withOrder = items.filter(item => item.order != null && item.order !== 0)

  // Sort items with order by their order value (stable sort preserves ties)
  withOrder.sort((a, b) => a.order - b.order)

  // Insert each ordered item at its specified position
  const result = [...withoutOrder]
  for (const item of withOrder) {
    // Clamp position to valid range (1-based, so subtract 1 for array index)
    const pos = Math.min(Math.max(item.order - 1, 0), result.length)
    result.splice(pos, 0, item)
  }

  return result
}
