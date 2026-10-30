import { useLayoutEffect, useMemo } from 'react'
import { useResizeObserver } from './useResizeObserver.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { getSafeZoneInset } from '../../utils/getSafeZoneInset.js'

const BANNER_DOCKED_CLASS = 'im-o-app__banner--docked'
const BANNER_PANEL_SELECTOR = '.im-c-panel--banner'
const ATTRIBUTIONS_STACKED_CLASS = 'im-o-app__attributions--stacked'

const buttonHeight = (ref) => ref?.current?.offsetHeight ?? 0
const buttonWidth = (ref) => ref?.current?.offsetWidth ?? 0

// Whether an element shows anything. Plugin controls are wrapped in an element with no box of
// its own (display: contents), so a wrapper counts as shown if anything inside it is.
const isRendered = (element) => {
  if (element.hidden) {
    return false
  }
  if (element.getClientRects().length > 0) {
    return true
  }
  return element.classList.contains('im-c-control-wrapper') && Array.from(element.children).some(isRendered)
}

// A top column with only hidden items still has its bottom padding, which would push the side
// column below it down. Treat it as empty instead.
const topColHeight = (col) => {
  const children = Array.from(col.children)
  const isAllHidden = children.length > 0 && !children.some(isRendered)
  return isAllHidden ? 0 : col.offsetHeight
}

// The wider of the two sides, so centred content stays in the middle.
const symmetricWidth = (left, right) => left || right ? Math.max(left, right) : 0

// Keeps the right column above the bottom-right buttons, including when the attributions have
// lifted them. With no bottom-right buttons, it clears the attributions instead.
const rightOffsetBottom = (containerPad, bottomRightHeight, attributionsHeight, rise, gap) =>
  containerPad + (bottomRightHeight > 0 ? bottomRightHeight + rise + gap : attributionsHeight)

// Keeps the keyboard hint above the bottom row, and above the actions bar on tablet and desktop,
// where the bar can sit higher than the row.
const hintBottom = (main, bottom, actionsEl, gap) => {
  const clearsBottomRow = main.offsetHeight - bottom.offsetTop + gap
  const actionsHeight = actionsEl?.offsetHeight ?? 0
  const actionsOffset = actionsHeight > 0 ? main.offsetHeight - actionsEl.offsetTop : 0
  return Math.max(clearsBottomRow, actionsOffset + gap)
}

const actionsBarRect = (actionsEl) => {
  const bar = actionsEl?.querySelector('.im-c-actions')
  return bar?.offsetHeight ? bar.getBoundingClientRect() : null
}

// The boxes shown in a sub-slot, including those inside control wrappers. The sub-slot itself is
// as wide as the column, so its own box can't tell us what lines up with the actions bar.
const renderedBoxes = (element) => Array.from(element?.children ?? []).flatMap(child => {
  if (child.hidden) {
    return []
  }
  if (child.getClientRects().length > 0) {
    return [child.getBoundingClientRect()]
  }
  return child.classList.contains('im-c-control-wrapper') ? renderedBoxes(child) : []
})

// How far the actions bar's top is above the bottom of main, when anything in the sub-slot lines
// up with the bar, or comes within margin of it. Otherwise 0. A bottom sub-slot also has to reach
// down to the bar. It moves up with its column, so this checks where its items would be if the
// column weren't lifted (lift), so lifting it doesn't undo itself the next time it's measured.
// A top sub-slot is only capped, which does nothing if it ends above the bar anyway.
const actionsBarOverlap = (mainRect, barRect, slotRef, margin, lift = null) => {
  if (!barRect) {
    return 0
  }
  const isInLine = (box) => barRect.left - margin < box.right && barRect.right + margin > box.left
  const reachesBar = (box) => lift === null || box.bottom + lift > barRect.top - margin
  const isOverlapping = renderedBoxes(slotRef?.current).some(box => isInLine(box) && reachesBar(box))
  return isOverlapping ? mainRect.bottom - barRect.top : 0
}

// How far a column has been lifted above where the bottom row alone would put it.
const columnLift = (mainRect, rowOffsetBottom, columnRef) => columnRef?.current
  ? Math.max(0, mainRect.bottom - rowOffsetBottom - columnRef.current.getBoundingClientRect().bottom)
  : 0

// On tablet and desktop the actions bar floats over the middle of the map. Only what would
// overlap it moves: a bottom sub-slot lifts the whole column above the bar, and a top sub-slot
// is capped above the bar, so the bottom sub-slot stays where it is. On mobile the bar is below
// the bottom row, so it never moves a column.
const clearActionsBar = ({ rowOffsetBottom, offsetTop, mainHeight, topOverlap, bottomOverlap, gap }) => ({
  offsetBottom: bottomOverlap > 0 ? Math.max(rowOffsetBottom, bottomOverlap + gap) : rowOffsetBottom,
  topSlotMaxHeight: topOverlap > 0 ? `${Math.max(0, mainHeight - topOverlap - gap - offsetTop)}px` : 'none'
})

// A sub-slot with only hidden items still has a box, so the column would leave a gap next to it.
// Only add the gap when both sub-slots show something.
const slotHasContent = (ref) => Array.from(ref?.current?.children ?? []).some(isRendered)

const subSlotGap = (topRef, bottomRef, gap) => slotHasContent(topRef) && slotHasContent(bottomRef) ? gap : 0

const columnContentHeight = (topRef, bottomRef, gap) => buttonHeight(topRef) + buttonHeight(bottomRef) + subSlotGap(topRef, bottomRef, gap)

// How far the actions bar, the last thing in main, runs past the bottom of main.
const flowOverflow = (main, mainRect, actions) => {
  if (!actions) {
    return 0
  }
  const marginBottom = Number.parseFloat(getComputedStyle(actions).marginBottom) || 0
  const paddingBottom = Number.parseFloat(getComputedStyle(main).paddingBottom) || 0
  return Math.max(0, actions.getBoundingClientRect().bottom + marginBottom - (mainRect.bottom - paddingBottom))
}

// On mobile the drawer sits below the map, but the side columns float over the map, so a tall
// drawer would squeeze them until their buttons sit under it, then run off the bottom. Its max
// height is its own height plus the space left in the fuller side column, less any overflow, so
// it stops just short of both, and grows again when there's room.
const drawerMaxHeight = (drawerRef, columnSlack, overflow) => slotHasContent(drawerRef)
  ? `${Math.max(0, Math.floor(drawerRef.current.offsetHeight + columnSlack - overflow))}px`
  : 'none'

// The space between the side columns, where a centred banner goes.
const bannerGutterWidth = (mainWidth, sideColWidth, gap) => mainWidth - (sideColWidth * 2) - (gap * 2)

const isBannerDocked = (gutterWidth, preferredWidth) => gutterWidth >= preferredWidth

// The widest width set on a banner panel, if any, used instead of the default.
const bannerConfiguredWidth = (bannerEl) => {
  const widths = Array.from(bannerEl?.querySelectorAll(BANNER_PANEL_SELECTOR) ?? [])
    .map(el => Number.parseInt(el.style.width, 10))
    .filter(w => !Number.isNaN(w))
  return widths.length ? Math.max(...widths) : null
}

// On mobile the banner is always full width, so remove any width set on its panels.
const clearBannerPanelWidths = (bannerEl) => {
  bannerEl?.querySelectorAll(BANNER_PANEL_SELECTOR).forEach(el => { el.style.width = '' })
}

// A centred banner is inset by the side column width; a full-width one isn't.
const bannerInset = (isDocked, primaryGap, sideColWidth, gap) =>
  isDocked ? primaryGap + sideColWidth + gap : primaryGap

// The width of the attribution text on one line. Turns wrapping off just long enough to measure
// it, then turns it back on.
const attributionsNaturalWidth = (attributionsEl) => {
  const textEl = attributionsEl?.firstElementChild
  if (!textEl) {
    return 0
  }
  const previousWhiteSpace = textEl.style.whiteSpace
  textEl.style.whiteSpace = 'nowrap'
  const width = textEl.scrollWidth
  textEl.style.whiteSpace = previousWhiteSpace
  return width
}

// Stacks the attributions on their own row once the text no longer fits beside the logo.
const isAttributionsStacked = (naturalWidth, availableWidth) => naturalWidth > availableWidth

// How far the attributions lift the bottom-right buttons. Docked, they grow up beside the
// buttons, so the buttons need a bottom margin to clear them. Stacked, they're a row below the
// buttons, which lifts them by the same amount without a margin. The right column clears this
// lift either way. Never below 0.
const attributionsRise = (attributionsHeight, dividerGap, primaryGap) =>
  Math.max(0, attributionsHeight + dividerGap - primaryGap)

// Only docked attributions need the bottom margin (see attributionsRise above).
const bottomRightClearance = (isStacked, rise) => isStacked ? 0 : rise

// Centres the banner between the side columns when there's room, otherwise puts it on its own
// full-width row (always on mobile). Returns what the side column offsets below need.
function applyBannerLayout ({ appContainer, root, top, bannerRef, leftRef, rightRef, isMobile, dividerGap, primaryGap }) {
  const banner = bannerRef?.current
  if (isMobile) {
    clearBannerPanelWidths(banner)
  }
  const bannerHeight = buttonHeight(bannerRef)
  const hasBanner = bannerHeight > 0
  const bannerSideColWidth = symmetricWidth(buttonWidth(leftRef), buttonWidth(rightRef))
  const defaultPreferredWidth = Number.parseInt(getComputedStyle(root).getPropertyValue('--banner-preferred-width'), 10)
  const preferredWidth = bannerConfiguredWidth(banner) ?? defaultPreferredWidth
  appContainer.style.setProperty('--banner-preferred-width', `${preferredWidth}px`)
  const gutterWidth = bannerGutterWidth(top.offsetWidth, bannerSideColWidth, dividerGap)
  const isDocked = !isMobile && isBannerDocked(gutterWidth, preferredWidth)
  banner?.classList.toggle(BANNER_DOCKED_CLASS, isDocked)

  const bannerSideInset = `${bannerInset(isDocked, primaryGap, bannerSideColWidth, dividerGap)}px`
  appContainer.style.setProperty('--banner-left', bannerSideInset)
  appContainer.style.setProperty('--banner-right', bannerSideInset)

  // Sits just below the top row, which already includes a gap at the bottom.
  const isBannerStacked = hasBanner && !isDocked
  const bannerTop = hasBanner ? top.offsetTop + top.offsetHeight : 0
  appContainer.style.setProperty('--banner-top', `${bannerTop}px`)

  return { isBannerStacked, bannerTop, bannerHeight }
}

// Puts the attributions beside the logo when they fit, otherwise on their own row below, which
// pushes the logo and bottom-right buttons up. Runs before the offsets below, as it changes the
// bottom row's size.
function applyAttributionsLayout ({ appContainer, bottom, attributions, dividerGap, primaryGap }) {
  const attributionsCol = bottom.children[1] // the bottom-right column, a DOM sibling of attributions
  const isStacked = isAttributionsStacked(attributionsNaturalWidth(attributions), attributionsCol?.offsetWidth ?? 0)
  attributions.classList.toggle(ATTRIBUTIONS_STACKED_CLASS, isStacked)
  // Measured from the page, because the space between the two bottom columns isn't a fixed gap.
  const left = attributionsCol ? Math.round(attributionsCol.getBoundingClientRect().left - bottom.getBoundingClientRect().left) : 0
  appContainer.style.setProperty('--attributions-left', `${left}px`)
  const rise = attributionsRise(attributions.offsetHeight, dividerGap, primaryGap)
  appContainer.style.setProperty('--bottom-right-clearance', `${bottomRightClearance(isStacked, rise)}px`)
  return { rise }
}

/**
 * Sets the layout CSS variables for the map overlay and the safe zone used by `fitBounds` and
 * `setView`. Waits until plugins are evaluated, so the map doesn't jump while buttons appear.
 */
export function calculateLayout (layoutRefs, breakpoint) {
  const {
    appContainerRef, mainRef, topRef, topLeftColRef, topRightColRef,
    bottomRef, attributionsRef, bottomRightRef, leftTopRef, leftBottomRef,
    rightTopRef, rightBottomRef, drawerRef, actionsRef, bannerRef, leftRef, rightRef
  } = layoutRefs

  const appContainer = appContainerRef.current
  const main = mainRef.current
  const top = topRef.current
  const topLeftCol = topLeftColRef.current
  const topRightCol = topRightColRef.current
  const bottom = bottomRef.current
  const attributions = attributionsRef.current

  if ([main, top, bottom].some(r => !r)) {
    return
  }

  const root = document.documentElement
  const dividerGap = Number.parseInt(getComputedStyle(root).getPropertyValue('--divider-gap'), 10)
  const primaryGap = Number.parseInt(getComputedStyle(root).getPropertyValue('--primary-gap'), 10)

  // Banner: centred between the side columns when there's room, otherwise full width
  const isMobile = breakpoint === 'mobile'
  const { isBannerStacked, bannerTop, bannerHeight } = applyBannerLayout({
    appContainer, root, top, bannerRef, leftRef, rightRef, isMobile, dividerGap, primaryGap
  })

  // A full-width banner pushes the side columns down below it. Done here rather than in CSS,
  // because closed panels stay in the page, hidden.
  const sideOffsetTop = (colHeight) => isBannerStacked
    ? bannerTop + bannerHeight + dividerGap
    : colHeight + top.offsetTop

  const { rise: attributionsLift } = applyAttributionsLayout({ appContainer, bottom, attributions, dividerGap, primaryGap })

  const actions = actionsRef?.current
  const mainRect = main.getBoundingClientRect()
  const barRect = actionsBarRect(actions)
  const clearBar = (rowOffsetBottom, offsetTop, topSlotRef, bottomSlotRef, columnRef) => clearActionsBar({
    rowOffsetBottom,
    offsetTop,
    mainHeight: main.offsetHeight,
    topOverlap: actionsBarOverlap(mainRect, barRect, topSlotRef, dividerGap),
    bottomOverlap: actionsBarOverlap(mainRect, barRect, bottomSlotRef, dividerGap, columnLift(mainRect, rowOffsetBottom, columnRef)),
    gap: dividerGap
  })

  // === Left container offsets ===
  const leftOffsetTop = sideOffsetTop(topColHeight(topLeftCol))
  const leftRowOffsetBottom = main.offsetHeight - bottom.offsetTop + dividerGap
  const leftBar = clearBar(leftRowOffsetBottom, leftOffsetTop, leftTopRef, leftBottomRef, leftRef)
  const leftColumnHeight = bottom.offsetTop - leftOffsetTop - dividerGap - (leftBar.offsetBottom - leftRowOffsetBottom)
  appContainer.style.setProperty('--left-offset-top', `${leftOffsetTop}px`)
  appContainer.style.setProperty('--left-offset-bottom', `${leftBar.offsetBottom}px`)
  appContainer.style.setProperty('--left-top-max-height', `${leftColumnHeight}px`)
  appContainer.style.setProperty('--left-top-slot-max-height', leftBar.topSlotMaxHeight)
  appContainer.style.setProperty('--left-slot-gap', `${subSlotGap(leftTopRef, leftBottomRef, dividerGap)}px`)

  // === Right container offsets === (mirrors the left formula)
  const bottomRightHeight = buttonHeight(bottomRightRef)
  const bottomContainerPad = main.offsetHeight - bottom.offsetTop - bottom.offsetHeight
  const rightOffsetTop = sideOffsetTop(topColHeight(topRightCol))
  const rightRowOffsetBottom = rightOffsetBottom(bottomContainerPad, bottomRightHeight, attributions.offsetHeight, attributionsLift, dividerGap)
  const rightBar = clearBar(rightRowOffsetBottom, rightOffsetTop, rightTopRef, rightBottomRef, rightRef)
  const rightEffectiveBottom = bottom.offsetTop + bottom.offsetHeight - bottomRightHeight - attributionsLift
  const rightColumnHeight = rightEffectiveBottom - rightOffsetTop - dividerGap - (rightBar.offsetBottom - rightRowOffsetBottom)
  appContainer.style.setProperty('--right-offset-top', `${rightOffsetTop}px`)
  appContainer.style.setProperty('--right-offset-bottom', `${rightBar.offsetBottom}px`)
  appContainer.style.setProperty('--right-top-max-height', `${rightColumnHeight}px`)
  appContainer.style.setProperty('--right-top-slot-max-height', rightBar.topSlotMaxHeight)
  appContainer.style.setProperty('--right-slot-gap', `${subSlotGap(rightTopRef, rightBottomRef, dividerGap)}px`)

  // === Drawer max height ===
  if (drawerRef?.current) {
    const columnSlack = Math.min(
      leftColumnHeight - columnContentHeight(leftTopRef, leftBottomRef, dividerGap),
      rightColumnHeight - columnContentHeight(rightTopRef, rightBottomRef, dividerGap)
    )
    appContainer.style.setProperty('--drawer-max-height', drawerMaxHeight(drawerRef, columnSlack, flowOverflow(main, mainRect, actions)))
  }

  // === Keyboard hint bottom offset ===
  appContainer.style.setProperty('--hint-bottom', `${hintBottom(main, bottom, actions, dividerGap)}px`)
}

export function useLayoutMeasurements () {
  const { dispatch, breakpoint, layoutRefs, arePluginsEvaluated, appVisible, isFullscreen } = useApp()
  const { mapSize, isMapReady } = useMap()

  const { bannerRef, mainRef, headerRef, topRef, topLeftColRef, topRightColRef, bottomRef, bottomRightRef, attributionsRef, leftTopRef, leftBottomRef, rightTopRef, rightBottomRef, drawerRef, actionsRef, leftRef, rightRef } = layoutRefs

  // 1. When the layout changes, wait for plugins to be evaluated again before setting the safe zone.
  useLayoutEffect(() => {
    dispatch({ type: 'CLEAR_PLUGINS_EVALUATED' })
  }, [breakpoint, mapSize, isMapReady, appVisible, isFullscreen])

  // 2. Once they are, set the layout and the safe zone on the next frame, after the page has updated.
  useLayoutEffect(() => {
    if (!arePluginsEvaluated) {
      return
    }
    requestAnimationFrame(() => {
      calculateLayout(layoutRefs, breakpoint)
      const safeZoneInset = getSafeZoneInset(layoutRefs)
      if (safeZoneInset) {
        dispatch({ type: 'SET_SAFE_ZONE_INSET', payload: { safeZoneInset } })
      }
    })
  }, [arePluginsEvaluated])

  // 3. Set the layout again whenever any of these change size. The safe zone is left to step 2.
  // Memoized so the observer isn't set up again on every render.
  const observedRefs = useMemo(
    // Includes the attributions, which change height when their text wraps
    () => [bannerRef, mainRef, headerRef, topRef, topLeftColRef, topRightColRef, actionsRef, bottomRef, bottomRightRef, attributionsRef, leftTopRef, leftBottomRef, rightTopRef, rightBottomRef, drawerRef, leftRef, rightRef],
    []
  )

  useResizeObserver(observedRefs, () => {
    calculateLayout(layoutRefs, breakpoint)
  })
}
