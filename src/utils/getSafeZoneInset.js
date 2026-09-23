/**
 * Calculates the safe zone inset — the unobscured region of the map viewport
 * not hidden behind overlay panels or structural UI (button columns, footer,
 * action bar). Used as padding for map operations like fitBounds or setView
 * so the target location or extent is fully visible.
 *
 * Each edge inset is driven by:
 *   - A structural baseline from the button columns, footer, and action bar.
 *   - A panel contribution once a panel (or the two panels stacked in a side's
 *     slots) covers more than 1/RATIO of the available map height (widening
 *     that side's left/right inset) and/or more than 1/RATIO of the available
 *     map width (pushing the top/bottom inset down/up). Both can trigger at
 *     once for a panel that's both tall and wide — independently, not
 *     exclusively, since the MAX_RATIO cap below already bounds each edge.
 *   - A cap so no single inset exceeds 1/MAX_RATIO of the map dimension,
 *     preventing fitBounds from zooming out to a corner when panels are large.
 *
 * @param {Object} refs - React refs from layoutRefs.
 * @param {React.RefObject}  refs.mainRef          - Main map container.
 * @param {React.RefObject}  refs.leftRef          - Left button column.
 * @param {React.RefObject}  refs.rightRef         - Right button column.
 * @param {React.RefObject}  refs.actionsRef       - Bottom action bar.
 * @param {React.RefObject}  refs.bottomRef        - Bottom row (logo, copyright, etc).
 * @param {React.RefObject} [refs.leftTopRef]      - Top-left panel slot.
 * @param {React.RefObject} [refs.leftBottomRef]   - Bottom-left panel slot.
 * @param {React.RefObject} [refs.rightTopRef]     - Top-right panel slot.
 * @param {React.RefObject} [refs.rightBottomRef]  - Bottom-right panel slot.
 * @returns {{ top: number, right: number, left: number, bottom: number } | undefined}
 *   Pixel insets from each edge of the main area, or undefined if any required ref is missing.
 */

const RATIO = 2 // panels covering more than 1/RATIO of the available height/width trigger that edge's inset
const MAX_RATIO = 3 // each inset is capped at 1/MAX_RATIO of its map dimension

// Query the panel element directly within its slot container.
// Only the first panel matters, and only when it is also the first element in the slot
// (i.e. no buttons or other elements precede it — a panel pushed down by buttons is
// already within the button-column structural inset and should not add extra padding).
const getPanelDimensions = (slotRef) => {
  if (!slotRef?.current) {
    return { offsetWidth: 0, offsetHeight: 0 }
  }
  const first = slotRef.current.firstElementChild
  if (!first?.classList.contains('im-c-panel') || first.offsetWidth === 0 || first.offsetHeight === 0) {
    return { offsetWidth: 0, offsetHeight: 0 }
  }
  return { offsetWidth: first.offsetWidth, offsetHeight: first.offsetHeight }
}

// Panels are in normal flow inside slot containers, expanding left/right offsetWidth.
// Query button groups directly to recover the button-only structural column width.
const getButtonColWidth = (colRef) => {
  const group = colRef?.current?.querySelector('.im-c-button-group')
  return group ? group.offsetWidth : 0
}

// Determines the column (left/right) inset from the two panels stacked in that side's
// slots. Combined height exceeding the threshold triggers the inset, widened to fit
// whichever panel is wider.
const computeColumn = (panelA, panelB, hThreshold, columnLeft, gap) => {
  const coverage = panelA.offsetHeight + panelB.offsetHeight + (panelA.offsetHeight > 0 && panelB.offsetHeight > 0 ? gap : 0)
  const triggered = coverage > hThreshold
  return triggered ? columnLeft + Math.max(panelA.offsetWidth, panelB.offsetWidth) + gap : 0
}

// Determines the row (top/bottom) inset from the panels docked in the left and right
// columns' near slot (both top, or both bottom). Combined width exceeding the threshold
// triggers the inset, deepened to fit whichever panel is taller. Evaluated independently
// of computeColumn — a panel can widen its own column AND push top/bottom down at once.
const computeRow = (leftPanel, rightPanel, wThreshold, baseInset, gap) => {
  const coverage = leftPanel.offsetWidth + rightPanel.offsetWidth + (leftPanel.offsetWidth > 0 && rightPanel.offsetWidth > 0 ? gap : 0)
  const triggered = coverage > wThreshold
  return triggered ? baseInset + Math.max(leftPanel.offsetHeight, rightPanel.offsetHeight) + gap : 0
}

export const getSafeZoneInset = ({
  mainRef, leftRef, rightRef, actionsRef, bottomRef,
  leftTopRef, leftBottomRef, rightTopRef, rightBottomRef
}) => {
  if ([mainRef, leftRef, rightRef, actionsRef, bottomRef].some(ref => !ref?.current)) {
    return undefined
  }

  const main = mainRef.current; const left = leftRef.current
  const actions = actionsRef.current; const bottom = bottomRef.current

  const gap = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--divider-gap'), 10)

  const rawTL = getPanelDimensions(leftTopRef); const rawBL = getPanelDimensions(leftBottomRef)
  const rawTR = getPanelDimensions(rightTopRef); const rawBR = getPanelDimensions(rightBottomRef)

  // Structural base insets — always present, never capped.
  const colWidth = Math.max(getButtonColWidth(leftRef), getButtonColWidth(rightRef))
  const baseLeft = main.offsetLeft + left.offsetLeft + colWidth + gap
  const baseRight = left.offsetLeft + colWidth + gap
  const baseTop = left.offsetTop
  const bottomContainerPad = main.offsetHeight - bottom.offsetTop - bottom.offsetHeight
  // Minimum: primary-gap above the bottom edge. Normally: divider-gap above the top of the bottom container.
  const bottomInset = Math.max(bottomContainerPad, main.offsetHeight - bottom.offsetTop + gap)
  const baseBottom = Math.max(main.offsetHeight - actions.offsetTop + gap, bottomInset)

  const availableH = main.offsetHeight - baseTop - baseBottom
  const availableW = main.offsetWidth - (baseLeft - main.offsetLeft) - baseRight

  const leftPanelInset = computeColumn(rawTL, rawBL, availableH / RATIO, main.offsetLeft + left.offsetLeft, gap)
  const rightPanelInset = computeColumn(rawTR, rawBR, availableH / RATIO, left.offsetLeft, gap)
  const topPanelInset = computeRow(rawTL, rawTR, availableW / RATIO, baseTop, gap)
  const bottomPanelInset = computeRow(rawBL, rawBR, availableW / RATIO, bottomInset, gap)

  const usableW = main.offsetWidth - 2 * gap
  const usableH = main.offsetHeight - 2 * gap
  const maxL = main.offsetLeft + usableW * (MAX_RATIO - 1) / MAX_RATIO
  const maxR = usableW * (MAX_RATIO - 1) / MAX_RATIO
  const maxV = usableH * (MAX_RATIO - 1) / MAX_RATIO

  return {
    left: Math.max(baseLeft, Math.min(leftPanelInset, maxL)),
    right: Math.max(baseRight, Math.min(rightPanelInset, maxR)),
    top: Math.max(baseTop, Math.min(topPanelInset, maxV)),
    bottom: Math.max(baseBottom, Math.min(bottomPanelInset, maxV))
  }
}
