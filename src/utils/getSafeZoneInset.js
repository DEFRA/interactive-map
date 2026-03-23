/**
 * Calculates the safe zone inset — the unobscured region of the map viewport
 * not hidden behind overlay panels or structural UI (button columns, footer,
 * action bar). Used as padding for map operations like fitBounds or setView
 * so the target location or extent is fully visible.
 *
 * Each edge inset is driven by:
 *   - A structural baseline from the button columns, footer, and action bar.
 *   - A panel contribution when panels on that edge cover more than 1/RATIO
 *     of the available map dimension along that edge.
 *   - A cap so no single inset exceeds 1/MAX_RATIO of the map dimension,
 *     preventing fitBounds from zooming out to a corner when panels are large.
 *
 * Trigger logic per edge:
 *   - left / right : combined HEIGHT of panels in that column vs available height
 *   - top / bottom : WIDTH of panels in that row vs available width
 *
 * When a panel individually exceeds BOTH the height and width thresholds it
 * would otherwise trigger both adjacent edges, pushing the safe zone into the
 * opposite corner. To prevent this, such panels are classified as either
 * "column-primary" (h/availableH ≥ w/availableW) or "row-primary" and only
 * contribute to their dominant edge. Panels that exceed at most one threshold
 * are never in conflict and contribute to both axes freely.
 *
 * @param {Object} refs - React refs from layoutRefs.
 * @param {React.RefObject}  refs.mainRef          - Main map container.
 * @param {React.RefObject}  refs.leftRef          - Left button column.
 * @param {React.RefObject}  refs.rightRef         - Right button column.
 * @param {React.RefObject}  refs.actionsRef       - Bottom action bar.
 * @param {React.RefObject}  refs.bottomRef        - Bottom row (logo, copyright, etc).
 * @param {React.RefObject} [refs.bottomRightRef]  - Bottom-right button container (collapses margin when empty).
 * @param {React.RefObject} [refs.leftTopRef]      - Top-left panel slot.
 * @param {React.RefObject} [refs.leftBottomRef]   - Bottom-left panel slot.
 * @param {React.RefObject} [refs.rightTopRef]     - Top-right panel slot.
 * @param {React.RefObject} [refs.rightBottomRef]  - Bottom-right panel slot.
 * @returns {{ top: number, right: number, left: number, bottom: number } | undefined}
 *   Pixel insets from each edge of the main area, or undefined if any required ref is missing.
 */

const RATIO = 2 // panels covering more than 1/RATIO of an edge trigger that edge's inset
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

// Returns the panel's contribution to column (left/right) and row (top/bottom) edges.
//
// A panel can only trigger BOTH adjacent edges simultaneously when it individually
// exceeds both the height threshold (h > availableH/RATIO) and the width threshold
// (w > availableW/RATIO). In that case, only the dominant direction is used, preventing
// a corner panel from pushing the safe zone into the opposite corner.
// When only one (or neither) threshold is individually exceeded, the panel contributes
// its dimensions to both axes freely (combined thresholds still apply later).
const panelContrib = (w, h, availableW, availableH) => {
  const hFrac = h / availableH
  const wFrac = w / availableW
  if (hFrac >= 1 / RATIO && wFrac >= 1 / RATIO) {
    return hFrac >= wFrac
      ? { colH: h, colW: w, rowW: 0, rowH: 0 } // column-primary (left/right)
      : { colH: 0, colW: 0, rowW: w, rowH: h } // row-primary (top/bottom)
  }
  return { colH: h, colW: w, rowW: w, rowH: h }
}

// Determines the column (left/right) inset and the row-axis contributions for both panels.
//
// Column coverage uses raw heights so that two panels whose combined height exceeds the
// threshold always trigger the column inset, even if one is individually row-primary.
// Exception: a single row-primary panel (no sibling, colH=0) is suppressed so it
// contributes to top/bottom instead — giving a larger safe zone in the horizontal direction.
// When triggered, row contributions for both panels are zeroed to prevent double-padding.
const computeColumn = (panelA, panelB, availableW, availableH, hThreshold, columnLeft, gap) => {
  const a = panelContrib(panelA.offsetWidth, panelA.offsetHeight, availableW, availableH)
  const b = panelContrib(panelB.offsetWidth, panelB.offsetHeight, availableW, availableH)
  const aSingleRowPrimary = panelB.offsetHeight === 0 && a.colH === 0
  const bSingleRowPrimary = panelA.offsetHeight === 0 && b.colH === 0
  const coverage = panelA.offsetHeight + panelB.offsetHeight + (panelA.offsetHeight > 0 && panelB.offsetHeight > 0 ? gap : 0)
  const triggered = coverage > hThreshold && !aSingleRowPrimary && !bSingleRowPrimary
  return {
    panelInset: triggered ? columnLeft + Math.max(panelA.offsetWidth, panelB.offsetWidth) + gap : 0,
    rowA: triggered ? { w: 0, h: 0 } : { w: a.rowW, h: a.rowH },
    rowB: triggered ? { w: 0, h: 0 } : { w: b.rowW, h: b.rowH }
  }
}

// Determines the row-axis (top/bottom) panel inset driven by combined panel width.
// The combined width test subsumes the individual checks (dimensions are non-negative).
const computeRow = (leftW, rightW, leftH, rightH, wThreshold, baseInset, gap) =>
  leftW + rightW > wThreshold ? baseInset + Math.max(leftH, rightH) + gap : 0

export const getSafeZoneInset = ({
  mainRef, leftRef, rightRef, actionsRef, bottomRef, bottomRightRef,
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
  const bottomRightHeight = bottomRightRef?.current?.offsetHeight ?? 0
  const bottomContainerPad = main.offsetHeight - bottom.offsetTop - bottom.offsetHeight
  const bottomInset = Math.max(bottomRightHeight, gap) + bottomContainerPad + gap // mirrors --right-offset-bottom CSS var
  const baseBottom = Math.max(main.offsetHeight - actions.offsetTop + gap, bottomInset)

  const availableH = main.offsetHeight - baseTop - baseBottom
  const availableW = main.offsetWidth - (baseLeft - main.offsetLeft) - baseRight

  const leftCol = computeColumn(rawTL, rawBL, availableW, availableH, availableH / RATIO, main.offsetLeft + left.offsetLeft, gap)
  const rightCol = computeColumn(rawTR, rawBR, availableW, availableH, availableH / RATIO, left.offsetLeft, gap)

  const leftPanelInset = leftCol.panelInset
  const rightPanelInset = rightCol.panelInset
  const topPanelInset = computeRow(leftCol.rowA.w, rightCol.rowA.w, leftCol.rowA.h, rightCol.rowA.h, availableW / RATIO, baseTop, gap)
  const bottomPanelInset = computeRow(leftCol.rowB.w, rightCol.rowB.w, leftCol.rowB.h, rightCol.rowB.h, availableW / RATIO, bottomInset, gap)

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
