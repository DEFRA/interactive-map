/**
 * Calculates the safe zone inset — the unobscured region of the map viewport
 * not hidden behind overlay panels, action bars or the footer. Used as padding
 * for map operations like setCenter or fitBounds so the full extent is visible.
 *
 * The algorithm measures the available space around the inset panel and decides
 * whether to push the safe area below or beside it, depending on whether the
 * layout is landscape or portrait oriented.
 *
 * @param {Object} refs - React refs for the key layout elements.
 * @param {React.RefObject} refs.mainRef - The main content area.
 * @param {React.RefObject} refs.insetRef - The inset panel (e.g. search results).
 * @param {React.RefObject} refs.leftRef - The left-hand button column.
 * @param {React.RefObject} refs.rightRef - The right-hand button column.
 * @param {React.RefObject} refs.actionsRef - The bottom action bar.
 * @param {React.RefObject} refs.footerRef - The footer (logo, copyright etc).
 * @returns {{ top: number, right: number, left: number, bottom: number } | undefined}
 *   Pixel insets from each edge of the main area, or undefined if any ref is missing.
 */
export const getSafeZoneInset = ({
  mainRef,
  insetRef,
  leftRef,
  rightRef,
  actionsRef,
  footerRef
}) => {
  const refs = [mainRef, insetRef, leftRef, rightRef, actionsRef, footerRef]

  if (refs.some(ref => !ref.current)) {
    return undefined
  }

  const [main, inset, left, right, actions, footer] = refs.map(ref => ref.current)

  const root = document.documentElement
  const dividerGap = Number.parseInt(getComputedStyle(root).getPropertyValue('--divider-gap'), 10)

  // === Safe area logic ===
  const availableHeight = actions.offsetTop - inset.offsetTop - dividerGap
  const leftOffset = left.offsetLeft + left.offsetWidth + dividerGap
  const rightOffset = left.offsetLeft + right.offsetWidth + dividerGap
  const availableWidth = main.offsetWidth - (leftOffset + rightOffset)
  const insetOverlapWidth = inset.offsetWidth - leftOffset + left.offsetLeft
  const isLandscape = availableWidth - insetOverlapWidth > availableHeight - inset.offsetHeight
  const topOffset = left.offsetTop + (!isLandscape && inset.offsetHeight > 0 ? inset.offsetHeight + dividerGap : 0)
  const combinedLeftOffset = isLandscape ? Math.max(inset.offsetWidth, left.offsetWidth) + left.offsetLeft + dividerGap : rightOffset
  const actionsOffset = main.offsetHeight - actions.offsetTop
  const footerOffset = main.offsetHeight - footer.offsetTop

  const RATIO = 2 // At what point is there enough room to leave the inset above
  const hasRoom = insetOverlapWidth < availableWidth / RATIO && inset.offsetHeight < availableHeight / RATIO

  const top = hasRoom ? inset.offsetTop : topOffset
  const combinedLeft = main.offsetLeft + (hasRoom ? rightOffset : combinedLeftOffset)
  const bottom = Math.max(actionsOffset, footerOffset) + dividerGap

  return { top, right: rightOffset, left: combinedLeft, bottom }
}
