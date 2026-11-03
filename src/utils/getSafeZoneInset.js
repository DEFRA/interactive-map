import { getRelativeBox } from './screenBox.js'

/**
 * Calculates the safe zone inset — the unobscured region of the map viewport
 * not hidden behind overlay panels or structural UI (button columns, footer,
 * action bar). Used as padding for map operations like fitBounds or setView
 * so the target location or extent is fully visible.
 *
 * Each edge inset is driven by:
 *   - A structural baseline from the button columns, footer, and action bar.
 *   - A panel contribution once the open panels stacked in a side's slots cover
 *     more than 1/RATIO of the available map height (widening that side's
 *     left/right inset) and/or more than 1/RATIO of the available map width
 *     (pushing the top/bottom inset down/up). Both can trigger at once for a
 *     panel that's both tall and wide — independently, not exclusively, since
 *     the MAX_RATIO cap below already bounds each edge.
 *   - A cap so no single inset exceeds (MAX_RATIO - 1)/MAX_RATIO of the map
 *     dimension, preventing fitBounds from zooming out to a corner when panels
 *     are large.
 *   - A fallback for each axis: if the panels leave less than 1/MIN_RATIO of
 *     the room the structural insets leave, that axis uses the structural
 *     insets only, so the map never fits into a sliver.
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
const MAX_RATIO = 3 // each inset is capped at (MAX_RATIO - 1)/MAX_RATIO of its map dimension
// An axis with less than 1/MIN_RATIO of the structural room left falls back to the structural insets.
// A single panel at the MAX_RATIO cap still leaves more than this.
const MIN_RATIO = 4

// Closed panels stay mounted with `hidden`
const isOpenPanel = (element) => element.classList.contains('im-c-panel') && !element.hidden

/**
 * Every open panel in a slot, wherever it sits among buttons and controls, as a box relative to
 * `origin`.
 *
 * @param {React.RefObject} slotRef - A panel slot.
 * @param {DOMRect} origin - The rect the boxes are measured from.
 * @returns {Array<{ left: number, top: number, right: number, bottom: number }>}
 */
export const getOpenPanelBoxes = (slotRef, origin) => Array.from(slotRef?.current?.children ?? [])
  .filter(isOpenPanel)
  .map(panel => panel.getBoundingClientRect())
  .filter(rect => rect.width > 0 && rect.height > 0)
  .map(rect => getRelativeBox(rect, origin))

const widthOf = (box) => box.right - box.left
const heightOf = (box) => box.bottom - box.top

// Sizes laid end to end, with the gap between each
const addUp = (sizes, gap) => sizes.length ? sizes.reduce((total, size) => total + size, 0) + gap * (sizes.length - 1) : 0

const widest = (boxes) => boxes.length ? Math.max(...boxes.map(widthOf)) : 0

// Panels are in normal flow inside slot containers, expanding left/right offsetWidth.
// Query button groups directly to recover the button-only structural column width.
const getButtonColWidth = (colRef) => {
  const group = colRef?.current?.querySelector('.im-c-button-group')
  return group ? group.offsetWidth : 0
}

// The open panels in a side's slots, stacked, trigger that side's inset once their heights added
// up pass the threshold. The inset then reaches the panels' furthest edge into the map.
const isColumnTriggered = (boxes, hThreshold, gap) => addUp(boxes.map(heightOf), gap) > hThreshold

// The open panels in the left and right near slots (both top, or both bottom) trigger that
// edge's inset once the widest on each side, added up, pass the threshold. Evaluated
// independently of the columns — a panel can widen its own column AND push top/bottom at once.
const isRowTriggered = (leftBoxes, rightBoxes, wThreshold, gap) =>
  addUp([widest(leftBoxes), widest(rightBoxes)].filter(width => width > 0), gap) > wThreshold

export const getSafeZoneInset = ({
  mainRef, leftRef, rightRef, actionsRef, bottomRef,
  leftTopRef, leftBottomRef, rightTopRef, rightBottomRef
}) => {
  if ([mainRef, leftRef, rightRef, actionsRef, bottomRef].some(ref => !ref?.current)) {
    return undefined
  }

  const main = mainRef.current; const leftButtons = leftRef.current
  const actions = actionsRef.current; const bottom = bottomRef.current

  const gap = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--divider-gap'), 10)

  // Panels measured by where they really are against the main area, so one below buttons, or
  // after the controls at the bottom of a slot, counts at its real position
  const mainRect = main.getBoundingClientRect()
  const topLeft = getOpenPanelBoxes(leftTopRef, mainRect); const bottomLeft = getOpenPanelBoxes(leftBottomRef, mainRect)
  const topRight = getOpenPanelBoxes(rightTopRef, mainRect); const bottomRight = getOpenPanelBoxes(rightBottomRef, mainRect)
  const leftColumn = [...topLeft, ...bottomLeft]; const rightColumn = [...topRight, ...bottomRight]
  const topRow = [...topLeft, ...topRight]; const bottomRow = [...bottomLeft, ...bottomRight]

  // Structural base insets — always present, never capped.
  const colWidth = Math.max(getButtonColWidth(leftRef), getButtonColWidth(rightRef))
  const baseLeft = main.offsetLeft + leftButtons.offsetLeft + colWidth + gap
  const baseRight = leftButtons.offsetLeft + colWidth + gap
  const baseTop = leftButtons.offsetTop
  const bottomContainerPad = main.offsetHeight - bottom.offsetTop - bottom.offsetHeight
  // Minimum: primary-gap above the bottom edge. Normally: divider-gap above the top of the bottom container.
  const footerInset = Math.max(bottomContainerPad, main.offsetHeight - bottom.offsetTop + gap)
  const baseBottom = Math.max(main.offsetHeight - actions.offsetTop + gap, footerInset)

  const availableH = main.offsetHeight - baseTop - baseBottom
  const availableW = main.offsetWidth - (baseLeft - main.offsetLeft) - baseRight

  const leftPanelInset = isColumnTriggered(leftColumn, availableH / RATIO, gap)
    ? main.offsetLeft + Math.max(...leftColumn.map(box => box.right)) + gap
    : 0
  const rightPanelInset = isColumnTriggered(rightColumn, availableH / RATIO, gap)
    ? main.offsetWidth - Math.min(...rightColumn.map(box => box.left)) + gap
    : 0
  const topPanelInset = isRowTriggered(topLeft, topRight, availableW / RATIO, gap)
    ? Math.max(...topRow.map(box => box.bottom)) + gap
    : 0
  const bottomPanelInset = isRowTriggered(bottomLeft, bottomRight, availableW / RATIO, gap)
    ? main.offsetHeight - Math.min(...bottomRow.map(box => box.top)) + gap
    : 0

  const usableW = main.offsetWidth - 2 * gap
  const usableH = main.offsetHeight - 2 * gap
  const maxL = main.offsetLeft + usableW * (MAX_RATIO - 1) / MAX_RATIO
  const maxR = usableW * (MAX_RATIO - 1) / MAX_RATIO
  const maxV = usableH * (MAX_RATIO - 1) / MAX_RATIO

  const cappedLeft = Math.max(baseLeft, Math.min(leftPanelInset, maxL))
  const cappedRight = Math.max(baseRight, Math.min(rightPanelInset, maxR))
  const cappedTop = Math.max(baseTop, Math.min(topPanelInset, maxV))
  const cappedBottom = Math.max(baseBottom, Math.min(bottomPanelInset, maxV))

  const isTooNarrow = main.offsetWidth - (cappedLeft - main.offsetLeft) - cappedRight < availableW / MIN_RATIO
  const isTooShort = main.offsetHeight - cappedTop - cappedBottom < availableH / MIN_RATIO

  return {
    left: isTooNarrow ? baseLeft : cappedLeft,
    right: isTooNarrow ? baseRight : cappedRight,
    top: isTooShort ? baseTop : cappedTop,
    bottom: isTooShort ? baseBottom : cappedBottom
  }
}
