import { getRelativeBox } from './screenBox.js'
import { topColHeight } from './renderedBoxes.js'

/**
 * The safe zone inset: the part of the map not hidden by the button columns, top row, actions bar
 * or open panels. Used as padding by fitBounds and setView so the target is fully visible.
 *
 * Each edge has a structural base: the button columns, the top row (mirrored at the bottom) and the
 * actions bar. Open panels push an edge further once they cover more than 1/RATIO of the room across
 * or down the map, capped at (MAX_RATIO - 1)/MAX_RATIO of it. If panels leave less than 1/MIN_RATIO
 * of the room on an axis, that axis falls back to the structural insets.
 *
 * @param {Object} refs - React refs from layoutRefs.
 * @param {React.RefObject}  refs.mainRef          - Main map container.
 * @param {React.RefObject}  refs.leftRef          - Left button column.
 * @param {React.RefObject}  refs.rightRef         - Right button column.
 * @param {React.RefObject}  refs.actionsRef       - Bottom action bar.
 * @param {React.RefObject}  refs.bottomRef        - Bottom row (logo, copyright, etc).
 * @param {React.RefObject} [refs.topRef]           - Top row of buttons.
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

// The open panels in the left and right near slots (both top, or both bottom) push that edge once
// the widest on each side, added up, pass the threshold. Returns the panels that push it, if any.
const rowPanels = (leftBoxes, rightBoxes, wThreshold, gap) =>
  addUp([widest(leftBoxes), widest(rightBoxes)].filter(width => width > 0), gap) > wThreshold
    ? [...leftBoxes, ...rightBoxes]
    : []

// No edge's panel inset goes past (MAX_RATIO - 1)/MAX_RATIO of the map, less a gap each side
const maxInset = (size, gap) => (size - 2 * gap) * (MAX_RATIO - 1) / MAX_RATIO

// Width first, as panels sit in the side columns: a side whose panels are tall enough is cleared by
// its own inset, then capped, and both fall back to the structural insets if too little is left.
// A side only counts as cleared if its final inset still reaches past its panels.
const resolveWidth = ({ main, leftColumn, rightColumn, base, availableW, availableH, gap }) => {
  const leftPanelInset = isColumnTriggered(leftColumn, availableH / RATIO, gap)
    ? main.offsetLeft + Math.max(...leftColumn.map(box => box.right)) + gap
    : 0
  const rightPanelInset = isColumnTriggered(rightColumn, availableH / RATIO, gap)
    ? main.offsetWidth - Math.min(...rightColumn.map(box => box.left)) + gap
    : 0
  const cappedLeft = Math.max(base.left, Math.min(leftPanelInset, main.offsetLeft + maxInset(main.offsetWidth, gap)))
  const cappedRight = Math.max(base.right, Math.min(rightPanelInset, maxInset(main.offsetWidth, gap)))
  const isTooNarrow = main.offsetWidth - (cappedLeft - main.offsetLeft) - cappedRight < availableW / MIN_RATIO
  const left = isTooNarrow ? base.left : cappedLeft
  const right = isTooNarrow ? base.right : cappedRight
  return {
    left,
    right,
    isLeftCleared: leftPanelInset > 0 && left >= leftPanelInset,
    isRightCleared: rightPanelInset > 0 && right >= rightPanelInset
  }
}

// Then height: only panels on a side the final width doesn't clear still cover the rest of the map,
// so only they push the top or bottom, then capped, and both fall back if too little is left.
const resolveHeight = ({ main, panels, width, base, availableW, availableH, gap }) => {
  const pushingPanels = (leftBoxes, rightBoxes) =>
    rowPanels(width.isLeftCleared ? [] : leftBoxes, width.isRightCleared ? [] : rightBoxes, availableW / RATIO, gap)
  const topPanels = pushingPanels(panels.topLeft, panels.topRight)
  const bottomPanels = pushingPanels(panels.bottomLeft, panels.bottomRight)
  const topPanelInset = topPanels.length ? Math.max(...topPanels.map(box => box.bottom)) + gap : 0
  const bottomPanelInset = bottomPanels.length ? main.offsetHeight - Math.min(...bottomPanels.map(box => box.top)) + gap : 0
  const cappedTop = Math.max(base.top, Math.min(topPanelInset, maxInset(main.offsetHeight, gap)))
  const cappedBottom = Math.max(base.bottom, Math.min(bottomPanelInset, maxInset(main.offsetHeight, gap)))
  const isTooShort = main.offsetHeight - cappedTop - cappedBottom < availableH / MIN_RATIO
  return { top: isTooShort ? base.top : cappedTop, bottom: isTooShort ? base.bottom : cappedBottom }
}

export const getSafeZoneInset = ({
  mainRef, leftRef, rightRef, actionsRef, bottomRef, topRef,
  leftTopRef, leftBottomRef, rightTopRef, rightBottomRef
}) => {
  if ([mainRef, leftRef, rightRef, actionsRef, bottomRef].some(ref => !ref?.current)) {
    return undefined
  }

  const main = mainRef.current; const leftButtons = leftRef.current
  const actions = actionsRef.current; const bottom = bottomRef.current

  const rootStyle = getComputedStyle(document.documentElement)
  const gap = Number.parseInt(rootStyle.getPropertyValue('--divider-gap'), 10)
  const primaryGap = Number.parseInt(rootStyle.getPropertyValue('--primary-gap'), 10)

  // Panels measured by where they really are against the main area, so one below buttons, or
  // after the controls at the bottom of a slot, counts at its real position
  const mainRect = main.getBoundingClientRect()
  const topLeft = getOpenPanelBoxes(leftTopRef, mainRect); const bottomLeft = getOpenPanelBoxes(leftBottomRef, mainRect)
  const topRight = getOpenPanelBoxes(rightTopRef, mainRect); const bottomRight = getOpenPanelBoxes(rightBottomRef, mainRect)
  const leftColumn = [...topLeft, ...bottomLeft]; const rightColumn = [...topRight, ...bottomRight]

  // Structural base insets — always present, never capped.
  const colWidth = Math.max(getButtonColWidth(leftRef), getButtonColWidth(rightRef))
  // The bottom row itself doesn't count. The bottom mirrors the top row and its margin, so the safe
  // zone is centred, but still clears the actions bar and anything below the row, such as the drawer
  const topRowHeight = Math.max(0, ...Array.from(topRef?.current?.children ?? [], topColHeight))
  const base = {
    left: main.offsetLeft + leftButtons.offsetLeft + colWidth + gap,
    right: leftButtons.offsetLeft + colWidth + gap,
    top: leftButtons.offsetTop,
    bottom: Math.max(
      primaryGap + topRowHeight,
      main.offsetHeight - actions.offsetTop + gap,
      main.offsetHeight - bottom.offsetTop - bottom.offsetHeight
    )
  }
  const availableH = main.offsetHeight - base.top - base.bottom
  const availableW = main.offsetWidth - (base.left - main.offsetLeft) - base.right

  const width = resolveWidth({ main, leftColumn, rightColumn, base, availableW, availableH, gap })
  const height = resolveHeight({ main, panels: { topLeft, topRight, bottomLeft, bottomRight }, width, base, availableW, availableH, gap })
  return { left: width.left, right: width.right, top: height.top, bottom: height.bottom }
}
