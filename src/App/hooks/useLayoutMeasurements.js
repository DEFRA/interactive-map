import { useLayoutEffect, useMemo } from 'react'
import { useResizeObserver } from './useResizeObserver.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { getSafeZoneInset } from '../../utils/getSafeZoneInset.js'

const BANNER_DOCKED_CLASS = 'im-o-app__banner--docked'

const buttonHeight = (ref) => ref?.current?.offsetHeight ?? 0
const buttonWidth = (ref) => ref?.current?.offsetWidth ?? 0

// Max of the two sides, applied symmetrically so centred content doesn't lean towards
// whichever side is emptier. Used for --top-col-width and the banner's gutter below.
const symmetricWidth = (left, right) => left || right ? Math.max(left, right) : 0

const subSlotMaxHeight = (columnHeight, siblingButtons, gap) => columnHeight - (siblingButtons ? siblingButtons + gap : 0)

// Space between .im-o-app__left/.im-o-app__right for the banner to dock in.
const bannerGutterWidth = (mainWidth, sideColWidth, gap) => mainWidth - (sideColWidth * 2) - (gap * 2)

const isBannerDocked = (gutterWidth, preferredWidth) => gutterWidth >= preferredWidth

// Docked insets to the side-column width so it can't overlap either side; stacked is full-bleed.
const bannerInset = (isDocked, primaryGap, sideColWidth, gap) =>
  isDocked ? primaryGap + sideColWidth + gap : primaryGap

/**
 * Manages all layout measurements for the map overlay and dispatches the safe
 * zone inset used by the map to pad `fitBounds` / `setView` operations.
 *
 * ## Lifecycle
 *
 * The safe zone must only be dispatched once every plugin button's reactive
 * props (`hiddenWhen`, `enableWhen`, `pressedWhen`, `expandedWhen`) have been
 * evaluated for the current app/map state. Dispatching too early — before
 * buttons that affect layout (e.g. the actions bar) have their correct
 * visibility — produces a stale inset that causes the map to jump when the UI
 * then settles into its real state.
 *
 * ### Trigger events
 * The following state changes can alter which buttons are visible and therefore
 * how much space the UI occupies:
 *   - `breakpoint`   — responsive layout changes (desktop ↔ mobile / tablet)
 *   - `mapSize`      — map container size variant changes
 *   - `isMapReady`   — plugins are enabled on `map:ready`, changing button visibility
 *   - `isFullscreen` — fullscreen entry/exit changes which buttons are visible
 *   - `appVisible`   — app shown/hidden by parent HTML outside React (hybrid mode)
 *
 * When any of these change, `CLEAR_PLUGINS_EVALUATED` is dispatched (Effect 2),
 * which prevents the safe zone from being re-dispatched until
 * `useButtonStateEvaluator` has completed a full pass with no button state
 * changes and sets `PLUGINS_EVALUATED` again.
 *
 * ### Safe zone dispatch
 * Effect 3 fires whenever `arePluginsEvaluated` transitions to `true`, at which
 * point DOM dimensions are stable and `getSafeZoneInset` can be read reliably.
 * A `requestAnimationFrame` is used to ensure the browser has committed all
 * layout changes before measuring.
 *
 * ### Resize observer
 * Effect 4 keeps CSS custom properties up to date whenever any observed element
 * resizes (e.g. panels opening, banner appearing, actions buttons toggling).
 * It does not dispatch the safe zone — safe zone dispatch is owned entirely by
 * Effect 3 to prevent jumps on panel open/close and other non-structural resizes.
 */
function calculateLayout (layoutRefs) {
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
  const banner = bannerRef?.current

  if ([main, top, bottom].some(r => !r)) {
    return
  }

  const root = document.documentElement
  const dividerGap = Number.parseInt(getComputedStyle(root).getPropertyValue('--divider-gap'), 10)
  const primaryGap = Number.parseInt(getComputedStyle(root).getPropertyValue('--primary-gap'), 10)

  // === Top column width ===
  const topColWidthPx = symmetricWidth(topLeftCol.offsetWidth, topRightCol.offsetWidth)
  appContainer.style.setProperty('--top-col-width', `${topColWidthPx}px`)

  // === Banner: docked (centred between .im-o-app__left/.im-o-app__right, up to its preferred
  // width) when there's room between them, otherwise stacked full-width below the top row ===
  const bannerHeight = buttonHeight(bannerRef)
  const hasBanner = bannerHeight > 0
  const bannerSideColWidth = symmetricWidth(buttonWidth(leftRef), buttonWidth(rightRef))
  const preferredWidth = Number.parseInt(getComputedStyle(root).getPropertyValue('--banner-preferred-width'), 10)
  const gutterWidth = bannerGutterWidth(top.offsetWidth, bannerSideColWidth, dividerGap)
  const isDocked = isBannerDocked(gutterWidth, preferredWidth)
  banner?.classList.toggle(BANNER_DOCKED_CLASS, isDocked)

  const bannerSideInset = `${bannerInset(isDocked, primaryGap, bannerSideColWidth, dividerGap)}px`
  appContainer.style.setProperty('--banner-left', bannerSideInset)
  appContainer.style.setProperty('--banner-right', bannerSideInset)

  // Never above the top row's own bottom edge, in either mode — top.offsetHeight already
  // bakes in a trailing --divider-gap via .im-o-app__top-col's padding-bottom.
  const isBannerStacked = hasBanner && !isDocked
  const bannerTop = hasBanner ? top.offsetTop + top.offsetHeight : 0
  appContainer.style.setProperty('--banner-top', `${bannerTop}px`)

  // Stacked pushes both side columns below the banner; docked (or no banner) leaves them as is.
  const sideOffsetTop = (colHeight) => isBannerStacked
    ? bannerTop + bannerHeight
    : colHeight + top.offsetTop

  // === Left container offsets ===
  const leftOffsetTop = sideOffsetTop(topLeftCol.offsetHeight)
  const leftColumnHeight = bottom.offsetTop - leftOffsetTop - dividerGap
  appContainer.style.setProperty('--left-offset-top', `${leftOffsetTop}px`)
  appContainer.style.setProperty('--left-offset-bottom', `${main.offsetHeight - bottom.offsetTop + dividerGap}px`)
  appContainer.style.setProperty('--left-top-max-height', `${leftColumnHeight}px`)

  // === Right container offsets ===
  // Mirrors the top formula (topRightCol.offsetHeight + top.offsetTop):
  // bottomRight.offsetHeight is 0 when no buttons so the offset collapses to just
  // the padding between the bottom of the bottom container and the bottom of main.
  const bottomRightHeight = bottomRightRef?.current?.offsetHeight ?? 0
  const bottomContainerPad = main.offsetHeight - bottom.offsetTop - bottom.offsetHeight
  const rightOffsetTop = sideOffsetTop(topRightCol.offsetHeight)
  const rightEffectiveBottom = bottom.offsetTop + bottom.offsetHeight - bottomRightHeight
  const rightColumnHeight = rightEffectiveBottom - rightOffsetTop - dividerGap
  const rightOffsetBottom = bottomContainerPad + (bottomRightHeight > 0 ? (bottomRightHeight + dividerGap) : attributions.offsetHeight)
  appContainer.style.setProperty('--right-offset-top', `${rightOffsetTop}px`)
  appContainer.style.setProperty('--right-offset-bottom', `${rightOffsetBottom}px`)
  appContainer.style.setProperty('--right-top-max-height', `${rightColumnHeight}px`)

  // === Keyboard hint bottom offset ===
  // On mobile the actions bar is in-flow so baseBottom already accounts for it.
  // On tablet/desktop the actions bar is position:absolute (not in flow), so baseBottom
  // only sees the bottom padding. actionsOffset measures the gap from the actions bar's
  // top edge to the bottom of main, ensuring the hint always clears the floating bar.
  const actionsEl = actionsRef?.current
  const actionsHeight = actionsEl?.offsetHeight ?? 0
  const baseBottom = main.offsetHeight - bottom.offsetTop - bottom.offsetHeight
  const actionsOffset = actionsHeight > 0 ? main.offsetHeight - actionsEl.offsetTop : 0
  appContainer.style.setProperty('--hint-bottom', `${Math.max(baseBottom, actionsOffset + dividerGap)}px`)

  // === Sub-slot panel max-heights ===
  appContainer.style.setProperty('--left-top-panel-max-height', `${subSlotMaxHeight(leftColumnHeight, buttonHeight(leftBottomRef), dividerGap)}px`)
  appContainer.style.setProperty('--left-bottom-panel-max-height', `${subSlotMaxHeight(leftColumnHeight, buttonHeight(leftTopRef), dividerGap)}px`)
  appContainer.style.setProperty('--right-top-panel-max-height', `${subSlotMaxHeight(rightColumnHeight, buttonHeight(rightBottomRef), dividerGap)}px`)
  appContainer.style.setProperty('--right-bottom-panel-max-height', `${subSlotMaxHeight(rightColumnHeight, buttonHeight(rightTopRef), dividerGap)}px`)
}

export function useLayoutMeasurements () {
  const { dispatch, breakpoint, layoutRefs, arePluginsEvaluated, appVisible, isFullscreen } = useApp()
  const { mapSize, isMapReady } = useMap()

  const { bannerRef, mainRef, topRef, topLeftColRef, topRightColRef, bottomRef, bottomRightRef, leftTopRef, leftBottomRef, rightTopRef, rightBottomRef, drawerRef, actionsRef, leftRef, rightRef } = layoutRefs

  // --------------------------------
  // 1. Clear the evaluated flag when structural inputs change so the safe zone
  //    is not dispatched until useButtonStateEvaluator has completed a full
  //    pass with the new app/map state and set PLUGINS_EVALUATED.
  // --------------------------------
  useLayoutEffect(() => {
    dispatch({ type: 'CLEAR_PLUGINS_EVALUATED' })
  }, [breakpoint, mapSize, isMapReady, appVisible, isFullscreen])

  // --------------------------------
  // 2. Once all plugin button props have been evaluated (arePluginsEvaluated),
  //    recalculate layout and dispatch the safe zone inset.
  //    RAF required to ensure browser layout is committed before measuring.
  // --------------------------------
  useLayoutEffect(() => {
    if (!arePluginsEvaluated) {
      return
    }
    requestAnimationFrame(() => {
      calculateLayout(layoutRefs)
      const safeZoneInset = getSafeZoneInset(layoutRefs)
      if (safeZoneInset) {
        dispatch({ type: 'SET_SAFE_ZONE_INSET', payload: { safeZoneInset } })
      }
    })
  }, [arePluginsEvaluated])

  // --------------------------------
  // 3. Recalculate CSS vars whenever observed elements resize (panels, banner,
  //    actions buttons, etc.). Safe zone is intentionally not dispatched here —
  //    that is Effect 2's responsibility.
  // --------------------------------
  // Stable reference — all entries are ref objects from useApp that never change.
  // Prevents useResizeObserver's effect from re-running (and cancelling its RAF)
  // on every render due to a new array literal being passed each time.
  const observedRefs = useMemo(
    () => [bannerRef, mainRef, topRef, topLeftColRef, topRightColRef, actionsRef, bottomRef, bottomRightRef, leftTopRef, leftBottomRef, rightTopRef, rightBottomRef, drawerRef, leftRef, rightRef],
    []
  )

  useResizeObserver(observedRefs, () => {
    calculateLayout(layoutRefs)
  })
}
