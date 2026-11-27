import { useLayoutEffect, useMemo } from 'react'
import { useResizeObserver } from './useResizeObserver.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { getSafeZoneInset } from '../../utils/getSafeZoneInset.js'
import { renderedBoxes, topColHeight } from '../../utils/renderedBoxes.js'

const BANNER_DOCKED_CLASS = 'im-o-app__banner--docked'
const BANNER_PANEL_SELECTOR = '.im-c-panel--banner'
const ATTRIBUTIONS_STACKED_CLASS = 'im-o-app__attributions--stacked'
const TOP_WRAPPED_CLASS = 'im-o-app__top--wrapped'
const SUBPIXEL_TOLERANCE = 1

const buttonHeight = (ref) => ref?.current?.offsetHeight ?? 0
const buttonWidth = (ref) => ref?.current?.offsetWidth ?? 0

// The wider of the two sides, so centred content stays in the middle.
const symmetricWidth = (left, right) => left || right ? Math.max(left, right) : 0

// The top of the highest of these bottom row elements that shows, relative to main, or null if none
// do. Measured from the page, as they're nested at different depths in the row.
const bottomRowTop = (mainRect, elements) => {
  const tops = elements.filter(element => element?.offsetHeight).map(element => element.getBoundingClientRect().top - mainRect.top)
  return tops.length ? Math.min(...tops) : null
}

// Keeps the keyboard hint just above the bottom-left column (the logo and bottom-left buttons) and
// attributions, ignoring the bottom-right slot so opening the map controls doesn't move it. It also
// clears the actions bar, and anything below the bottom row, such as the drawer on mobile.
const hintBottom = ({ main, mainRect, bottom, bottomLeftCol, attributions, actionsEl, gap }) => {
  const rowTop = bottomRowTop(mainRect, [bottomLeftCol, attributions]) ?? bottom.offsetTop + bottom.offsetHeight
  const actionsOffset = actionsEl?.offsetHeight ? main.offsetHeight - actionsEl.offsetTop : 0
  return Math.max(main.offsetHeight - rowTop, actionsOffset) + gap
}

const actionsBarRect = (actionsEl) => {
  const bar = actionsEl?.querySelector('.im-c-actions')
  return bar?.offsetHeight ? bar.getBoundingClientRect() : null
}

// A sub-slot with only hidden items still has a box, so the column would leave a gap next to it.
// Only add the gap when both sub-slots show something.
const slotHasContent = (ref) => renderedBoxes(ref?.current).length > 0

const subSlotGap = (topRef, bottomRef, gap) => slotHasContent(topRef) && slotHasContent(bottomRef) ? gap : 0

const columnContentHeight = (topRef, bottomRef, gap) => buttonHeight(topRef) + buttonHeight(bottomRef) + subSlotGap(topRef, bottomRef, gap)

// How far the actions bar's top is above the bottom of main, when anything in the sub-slot would
// overlap the bar, or come within margin of it: in line with it and reaching down to it. Otherwise 0.
// Measured with the side columns as they'd be without the bar (see applyColumnLayout). The sub-slot
// itself is as wide as the column, so what it shows is measured instead.
const actionsBarOverlap = (mainRect, barRect, slotRef, margin) => {
  if (!barRect) {
    return 0
  }
  const isInLine = (box) => barRect.left - margin < box.right && barRect.right + margin > box.left
  const reachesBar = (box) => box.bottom > barRect.top - margin
  const isOverlapping = renderedBoxes(slotRef?.current).some(box => isInLine(box) && reachesBar(box))
  return isOverlapping ? mainRect.bottom - barRect.top : 0
}

// On tablet and desktop the actions bar floats over the middle of the map. Only what would
// overlap it moves: a bottom sub-slot lifts the whole column above the bar, and a top sub-slot
// is capped above the bar, so the bottom sub-slot stays where it is. On mobile the bar is below
// the bottom row, so it never moves a column.
const clearActionsBar = ({ mainRect, barRect, mainHeight, baseOffsetBottom, offsetTop, topRef, bottomRef, gap }) => {
  const topOverlap = actionsBarOverlap(mainRect, barRect, topRef, gap)
  const bottomOverlap = actionsBarOverlap(mainRect, barRect, bottomRef, gap)
  return {
    offsetBottom: bottomOverlap > 0 ? Math.max(baseOffsetBottom, bottomOverlap + gap) : baseOffsetBottom,
    topSlotMaxHeight: topOverlap > 0 ? `${Math.max(0, mainHeight - topOverlap - gap - offsetTop)}px` : 'none'
  }
}

// How far the actions bar, the last thing in main, runs past the bottom of main.
const flowOverflow = (main, actions) => {
  if (!actions) {
    return 0
  }
  const mainRect = main.getBoundingClientRect()
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

// Lets the top row's columns wrap once they no longer fit on one line. Measured without the class,
// so the row's natural width decides, rather than how it's currently wrapped.
function applyTopRowLayout (top) {
  top.classList.remove(TOP_WRAPPED_CLASS)
  top.classList.toggle(TOP_WRAPPED_CLASS, top.scrollWidth > top.clientWidth + SUBPIXEL_TOLERANCE)
}

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
// pushes the logo and bottom-right buttons up. Docked, they grow up beside the bottom-right buttons,
// so the buttons need a bottom margin to clear them. Stacked, they're a row below the buttons, which
// lifts them by the same amount without a margin.
function applyAttributionsLayout ({ appContainer, bottom, attributionsCol, attributions, dividerGap, primaryGap }) {
  const isStacked = attributionsNaturalWidth(attributions) > (attributionsCol?.offsetWidth ?? 0)
  attributions.classList.toggle(ATTRIBUTIONS_STACKED_CLASS, isStacked)
  // Measured from the page, because the space between the two bottom columns isn't a fixed gap.
  const left = attributionsCol ? Math.round(attributionsCol.getBoundingClientRect().left - bottom.getBoundingClientRect().left) : 0
  appContainer.style.setProperty('--attributions-left', `${left}px`)
  const clearance = isStacked ? 0 : Math.max(0, attributions.offsetHeight + dividerGap - primaryGap)
  appContainer.style.setProperty('--bottom-right-clearance', `${clearance}px`)
}

// Places the side columns. Each runs from below the top row to a gap above what's shown on its own
// side of the bottom row, or to main's bottom padding when nothing is. They're put there without the
// actions bar's lift or cap before measuring what would overlap the bar. Otherwise moving something
// clear of the bar would change whether it needs to move, and the next measurement would undo it.
// The browser doesn't draw this in-between layout. Returns the room left below each column's content.
function applyColumnLayout ({ appContainer, main, actions, columns, gap }) {
  const setColumn = (side, name, value) => appContainer.style.setProperty(`--${side}-${name}`, value)
  Object.entries(columns).forEach(([side, { offsetTop, baseOffsetBottom, topRef, bottomRef }]) => {
    setColumn(side, 'offset-top', `${offsetTop}px`)
    setColumn(side, 'offset-bottom', `${baseOffsetBottom}px`)
    setColumn(side, 'top-slot-max-height', 'none')
    setColumn(side, 'slot-gap', `${subSlotGap(topRef, bottomRef, gap)}px`)
  })

  const mainRect = main.getBoundingClientRect()
  const barRect = actionsBarRect(actions)
  return Object.entries(columns).map(([side, { offsetTop, baseOffsetBottom, topRef, bottomRef }]) => {
    const bar = clearActionsBar({ mainRect, barRect, mainHeight: main.offsetHeight, baseOffsetBottom, offsetTop, topRef, bottomRef, gap })
    setColumn(side, 'offset-bottom', `${bar.offsetBottom}px`)
    setColumn(side, 'top-slot-max-height', bar.topSlotMaxHeight)
    return main.offsetHeight - bar.offsetBottom - offsetTop - columnContentHeight(topRef, bottomRef, gap)
  })
}

/**
 * Sets the layout CSS variables for the map overlay and the safe zone used by `fitBounds` and
 * `setView`. Waits until plugins are evaluated, so the map doesn't jump while buttons appear.
 */
export function calculateLayout (layoutRefs, breakpoint) {
  const {
    appContainerRef, mainRef, topRef, topLeftColRef, topRightColRef,
    bottomRef, bottomLeftColRef, bottomRightColRef, bottomRightRef, attributionsRef, leftTopRef, leftBottomRef,
    rightTopRef, rightBottomRef, drawerRef, actionsRef, bannerRef, leftRef, rightRef
  } = layoutRefs

  const appContainer = appContainerRef.current
  const main = mainRef.current
  const top = topRef.current
  const bottom = bottomRef.current
  const attributions = attributionsRef.current

  if ([main, top, bottom].some(r => !r)) {
    return
  }

  const root = document.documentElement
  const rootStyle = getComputedStyle(root)
  const dividerGap = Number.parseInt(rootStyle.getPropertyValue('--divider-gap'), 10)
  const primaryGap = Number.parseInt(rootStyle.getPropertyValue('--primary-gap'), 10)

  applyTopRowLayout(top)

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

  applyAttributionsLayout({ appContainer, bottom, attributionsCol: bottomRightColRef?.current, attributions, dividerGap, primaryGap })

  const actions = actionsRef?.current
  const bottomLeftCol = bottomLeftColRef?.current
  const mainRect = main.getBoundingClientRect()
  // A gap above what's shown on that side of the bottom row, else main's bottom padding. Docked
  // attributions sit on the right; stacked ones run the full width
  const containerPad = main.offsetHeight - bottom.offsetTop - bottom.offsetHeight
  const baseOffsetBottom = (rowElements) => {
    const rowTop = bottomRowTop(mainRect, rowElements)
    return rowTop === null ? containerPad : main.offsetHeight - rowTop + dividerGap
  }
  const isStacked = attributions.classList.contains(ATTRIBUTIONS_STACKED_CLASS)
  const columns = {
    left: {
      offsetTop: sideOffsetTop(topColHeight(topLeftColRef.current)),
      baseOffsetBottom: baseOffsetBottom([bottomLeftCol, isStacked && attributions]),
      topRef: leftTopRef,
      bottomRef: leftBottomRef
    },
    right: {
      offsetTop: sideOffsetTop(topColHeight(topRightColRef.current)),
      baseOffsetBottom: baseOffsetBottom([bottomRightRef?.current, attributions]),
      topRef: rightTopRef,
      bottomRef: rightBottomRef
    }
  }
  const columnSlack = applyColumnLayout({ appContainer, main, actions, columns, gap: dividerGap })

  // === Drawer max height ===
  appContainer.style.setProperty('--drawer-max-height', drawerMaxHeight(drawerRef, Math.min(...columnSlack), flowOverflow(main, actions)))

  // === Keyboard hint bottom offset ===
  appContainer.style.setProperty('--hint-bottom', `${hintBottom({ main, mainRect, bottom, bottomLeftCol, attributions, actionsEl: actions, gap: dividerGap })}px`)
}

export function useLayoutMeasurements () {
  const { dispatch, breakpoint, layoutRefs, arePluginsEvaluated, appVisible, isFullscreen } = useApp()
  const { mapSize, isMapReady } = useMap()

  const { bannerRef, mainRef, headerRef, topRef, topLeftColRef, topMiddleColRef, topRightColRef, bottomRef, bottomLeftColRef, bottomRightRef, attributionsRef, leftTopRef, leftBottomRef, rightTopRef, rightBottomRef, drawerRef, actionsRef, leftRef, rightRef } = layoutRefs

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
    // Includes the attributions, which change height when their text wraps, and the bottom-left
    // column, which changes size when the logo loads or its buttons change
    () => [bannerRef, mainRef, headerRef, topRef, topLeftColRef, topMiddleColRef, topRightColRef, actionsRef, bottomRef, bottomLeftColRef, bottomRightRef, attributionsRef, leftTopRef, leftBottomRef, rightTopRef, rightBottomRef, drawerRef, leftRef, rightRef],
    []
  )

  useResizeObserver(observedRefs, () => {
    calculateLayout(layoutRefs, breakpoint)
  })
}
