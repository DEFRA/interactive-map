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

// Max of both sides, so centred content doesn't lean toward the emptier one.
const symmetricWidth = (left, right) => left || right ? Math.max(left, right) : 0

const subSlotMaxHeight = (columnHeight, siblingButtons, gap) => columnHeight - (siblingButtons ? siblingButtons + gap : 0)

// bottomRightHeight is 0 when empty, falling back to the attributions' own height for spacing.
const rightOffsetBottom = (containerPad, bottomRightHeight, attributionsHeight, gap) =>
  containerPad + (bottomRightHeight > 0 ? bottomRightHeight + gap : attributionsHeight)

// Clears the bottom row's own TOP edge (not just its trailing gap below), so the hint
// never overlaps the logo/attribution row itself, plus a gap above it. That trivially
// also clears anything after the row in flow — mobile's in-flow actions bar included.
// Tablet/desktop's floating actions bar can sit independently higher than the row, so
// still needs its own explicit clearance, hence the Math.max with actionsOffset below.
const hintBottom = (main, bottom, actionsEl, gap) => {
  const clearsBottomRow = main.offsetHeight - bottom.offsetTop + gap
  const actionsHeight = actionsEl?.offsetHeight ?? 0
  const actionsOffset = actionsHeight > 0 ? main.offsetHeight - actionsEl.offsetTop : 0
  return Math.max(clearsBottomRow, actionsOffset + gap)
}

// Space between .im-o-app__left/.im-o-app__right for the banner to dock in.
const bannerGutterWidth = (mainWidth, sideColWidth, gap) => mainWidth - (sideColWidth * 2) - (gap * 2)

const isBannerDocked = (gutterWidth, preferredWidth) => gutterWidth >= preferredWidth

// Widest explicit width configured on a banner panel, if any, overriding the default.
const bannerConfiguredWidth = (bannerEl) => {
  const widths = Array.from(bannerEl?.querySelectorAll(BANNER_PANEL_SELECTOR) ?? [])
    .map(el => Number.parseInt(el.style.width, 10))
    .filter(w => !Number.isNaN(w))
  return widths.length ? Math.max(...widths) : null
}

// Mobile always stacks full-width, so any inline width Panel.jsx applied is ignored.
const clearBannerPanelWidths = (bannerEl) => {
  bannerEl?.querySelectorAll(BANNER_PANEL_SELECTOR).forEach(el => { el.style.width = '' })
}

// Docked insets to the side-column width; stacked is full-bleed.
const bannerInset = (isDocked, primaryGap, sideColWidth, gap) =>
  isDocked ? primaryGap + sideColWidth + gap : primaryGap

// Natural (unwrapped) width of the attribution text, measured by forcing nowrap just long
// enough to read scrollWidth, then restoring — same "mutate, measure, restore" approach as
// clearBannerPanelWidths/bannerConfiguredWidth above. Needed because once wrapping is
// allowed, scrollWidth alone can't tell us how wide the text *would* be on one line.
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

// Stacks (drops to its own full-width row below the logo) once the attribution text no
// longer fits, at its natural width, in the space beside the logo column.
const isAttributionsStacked = (naturalWidth, availableWidth) => naturalWidth > availableWidth

// Docked, attributions bleeds primaryGap below the row's bottom edge then grows upward from
// there by its own height — once that height exceeds primaryGap, it creeps back up into the
// row itself, where .im-o-app__bottom-right shares the same horizontal space. This is how far
// that needs pushing up to stay clear. Stacked already has its own clearance (the stacked
// rule's margin-top), so none is needed there.
const attributionsBottomRightClearance = (isStacked, attributionsHeight, dividerGap, primaryGap) =>
  isStacked ? 0 : Math.max(0, attributionsHeight + dividerGap - primaryGap)

// Docks centred between the side columns when there's room, otherwise stacks full-width
// (mobile always stacks). Sets the banner's own CSS vars and returns what the side-column
// offset calc below needs.
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

  // Sits at the top row's bottom edge; top.offsetHeight already includes a trailing gap.
  const isBannerStacked = hasBanner && !isDocked
  const bannerTop = hasBanner ? top.offsetTop + top.offsetHeight : 0
  appContainer.style.setProperty('--banner-top', `${bannerTop}px`)

  return { isBannerStacked, bannerTop, bannerHeight }
}

// Docks attributions beside the logo when its natural width fits there, otherwise stacks it
// onto its own full-width row below (im-o-app__attributions--stacked, in layout.module.scss),
// genuinely growing .im-o-app__bottom and pushing the logo and bottom-right buttons up. Must
// run before the offsets below, since toggling the stacked class changes
// bottom.offsetTop/offsetHeight that they read.
function applyAttributionsLayout ({ appContainer, bottom, attributions, dividerGap, primaryGap }) {
  const attributionsCol = bottom.children[1] // the bottom-right column, a DOM sibling of attributions
  const isStacked = isAttributionsStacked(attributionsNaturalWidth(attributions), attributionsCol?.offsetWidth ?? 0)
  attributions.classList.toggle(ATTRIBUTIONS_STACKED_CLASS, isStacked)
  // getBoundingClientRect, not offset math, because .im-o-app__bottom's `justify-content:
  // space-between` gap between the two columns isn't a fixed value (unlike `gap`) to reconstruct.
  const left = attributionsCol ? Math.round(attributionsCol.getBoundingClientRect().left - bottom.getBoundingClientRect().left) : 0
  appContainer.style.setProperty('--attributions-left', `${left}px`)
  const clearance = attributionsBottomRightClearance(isStacked, attributions.offsetHeight, dividerGap, primaryGap)
  appContainer.style.setProperty('--bottom-right-clearance', `${clearance}px`)
}

/**
 * Computes layout CSS vars for the map overlay and dispatches the safe zone inset used
 * for `fitBounds`/`setView`. Waits for `arePluginsEvaluated` so the inset reflects final
 * button visibility rather than a mid-evaluation state, which would make the map jump.
 */
function calculateLayout (layoutRefs, breakpoint) {
  const {
    appContainerRef, mainRef, topRef, topLeftColRef, topRightColRef,
    bottomRef, attributionsRef, bottomRightRef, leftTopRef, leftBottomRef,
    rightTopRef, rightBottomRef, actionsRef, bannerRef, leftRef, rightRef
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

  // === Top column width ===
  const topColWidthPx = symmetricWidth(topLeftCol.offsetWidth, topRightCol.offsetWidth)
  appContainer.style.setProperty('--top-col-width', `${topColWidthPx}px`)

  // Banner: docks centred between the side columns when there's room, otherwise stacks
  // full-width. Mobile always stacks.
  const isMobile = breakpoint === 'mobile'
  const { isBannerStacked, bannerTop, bannerHeight } = applyBannerLayout({
    appContainer, root, top, bannerRef, leftRef, rightRef, isMobile, dividerGap, primaryGap
  })

  // Stacked pushes the side columns below the banner plus a trailing gap — added here, not
  // via a CSS last-child margin, since closed consumer HTML panels stay in the DOM (display:none).
  const sideOffsetTop = (colHeight) => isBannerStacked
    ? bannerTop + bannerHeight + dividerGap
    : colHeight + top.offsetTop

  applyAttributionsLayout({ appContainer, bottom, attributions, dividerGap, primaryGap })

  // === Left container offsets ===
  const leftOffsetTop = sideOffsetTop(topLeftCol.offsetHeight)
  const leftColumnHeight = bottom.offsetTop - leftOffsetTop - dividerGap
  appContainer.style.setProperty('--left-offset-top', `${leftOffsetTop}px`)
  appContainer.style.setProperty('--left-offset-bottom', `${main.offsetHeight - bottom.offsetTop + dividerGap}px`)
  appContainer.style.setProperty('--left-top-max-height', `${leftColumnHeight}px`)

  // === Right container offsets === (mirrors the left formula)
  const bottomRightHeight = buttonHeight(bottomRightRef)
  const bottomContainerPad = main.offsetHeight - bottom.offsetTop - bottom.offsetHeight
  const rightOffsetTop = sideOffsetTop(topRightCol.offsetHeight)
  const rightEffectiveBottom = bottom.offsetTop + bottom.offsetHeight - bottomRightHeight
  const rightColumnHeight = rightEffectiveBottom - rightOffsetTop - dividerGap
  appContainer.style.setProperty('--right-offset-top', `${rightOffsetTop}px`)
  appContainer.style.setProperty('--right-offset-bottom', `${rightOffsetBottom(bottomContainerPad, bottomRightHeight, attributions.offsetHeight, dividerGap)}px`)
  appContainer.style.setProperty('--right-top-max-height', `${rightColumnHeight}px`)

  // === Keyboard hint bottom offset ===
  appContainer.style.setProperty('--hint-bottom', `${hintBottom(main, bottom, actionsRef?.current, dividerGap)}px`)

  // === Sub-slot panel max-heights ===
  appContainer.style.setProperty('--left-top-panel-max-height', `${subSlotMaxHeight(leftColumnHeight, buttonHeight(leftBottomRef), dividerGap)}px`)
  appContainer.style.setProperty('--left-bottom-panel-max-height', `${subSlotMaxHeight(leftColumnHeight, buttonHeight(leftTopRef), dividerGap)}px`)
  appContainer.style.setProperty('--right-top-panel-max-height', `${subSlotMaxHeight(rightColumnHeight, buttonHeight(rightBottomRef), dividerGap)}px`)
  appContainer.style.setProperty('--right-bottom-panel-max-height', `${subSlotMaxHeight(rightColumnHeight, buttonHeight(rightTopRef), dividerGap)}px`)
}

export function useLayoutMeasurements () {
  const { dispatch, breakpoint, layoutRefs, arePluginsEvaluated, appVisible, isFullscreen } = useApp()
  const { mapSize, isMapReady } = useMap()

  const { bannerRef, mainRef, headerRef, topRef, topLeftColRef, topRightColRef, bottomRef, bottomRightRef, attributionsRef, leftTopRef, leftBottomRef, rightTopRef, rightBottomRef, drawerRef, actionsRef, leftRef, rightRef } = layoutRefs

  // 1. Clear the evaluated flag on structural changes, gating the safe zone until re-evaluated.
  useLayoutEffect(() => {
    dispatch({ type: 'CLEAR_PLUGINS_EVALUATED' })
  }, [breakpoint, mapSize, isMapReady, appVisible, isFullscreen])

  // 2. Once evaluated, recalculate layout and dispatch the safe zone (RAF waits for layout to commit).
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

  // 3. Recalculate CSS vars on resize; safe zone dispatch stays Effect 2's job.
  // Memoized so useResizeObserver doesn't re-run (and cancel its RAF) on every render.
  const observedRefs = useMemo(
    // attributionsRef included so its height (now variable, since attribution text can wrap
    // onto multiple lines) recalculates --right-offset-bottom when the wrap changes.
    () => [bannerRef, mainRef, headerRef, topRef, topLeftColRef, topRightColRef, actionsRef, bottomRef, bottomRightRef, attributionsRef, leftTopRef, leftBottomRef, rightTopRef, rightBottomRef, drawerRef, leftRef, rightRef],
    []
  )

  useResizeObserver(observedRefs, () => {
    calculateLayout(layoutRefs, breakpoint)
  })
}
