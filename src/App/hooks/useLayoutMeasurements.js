import { useLayoutEffect } from 'react'
import { useResizeObserver } from './useResizeObserver.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { getSafeZoneInset } from '../../utils/getSafeZoneInset.js'

const buttonHeight = (ref) => ref?.current?.offsetHeight ?? 0

const topColWidth = (left, right) =>
  left || right ? Math.max(left, right) : 0

const subSlotMaxHeight = (columnHeight, siblingButtons, gap) =>
  columnHeight - (siblingButtons ? siblingButtons + gap : 0)

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
    rightTopRef, rightBottomRef
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

  // === Top column width ===
  appContainer.style.setProperty('--top-col-width', `${topColWidth(topLeftCol.offsetWidth, topRightCol.offsetWidth)}px`)

  // === Left container offsets ===
  const leftOffsetTop = topLeftCol.offsetHeight + top.offsetTop
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
  const rightOffsetTop = topRightCol.offsetHeight + top.offsetTop
  const rightEffectiveBottom = bottom.offsetTop + bottom.offsetHeight - bottomRightHeight
  const rightColumnHeight = rightEffectiveBottom - rightOffsetTop - dividerGap
  const rightOffsetBottom = bottomContainerPad + (bottomRightHeight > 0 ? (bottomRightHeight + dividerGap) : attributions.offsetHeight)
  appContainer.style.setProperty('--right-offset-top', `${rightOffsetTop}px`)
  appContainer.style.setProperty('--right-offset-bottom', `${rightOffsetBottom}px`)
  appContainer.style.setProperty('--right-top-max-height', `${rightColumnHeight}px`)

  // === Keyboard hint bottom offset ===
  // Positions the hint at the bottom of im-o-app__bottom (above drawers on mobile)
  const appRect = appContainer.getBoundingClientRect()
  const bottomRect = bottom.getBoundingClientRect()
  appContainer.style.setProperty('--keyboard-hint-bottom', `${Math.max(0, appRect.bottom - bottomRect.bottom)}px`)

  // === Sub-slot panel max-heights ===
  appContainer.style.setProperty('--left-top-panel-max-height', `${subSlotMaxHeight(leftColumnHeight, buttonHeight(leftBottomRef), dividerGap)}px`)
  appContainer.style.setProperty('--left-bottom-panel-max-height', `${subSlotMaxHeight(leftColumnHeight, buttonHeight(leftTopRef), dividerGap)}px`)
  appContainer.style.setProperty('--right-top-panel-max-height', `${subSlotMaxHeight(rightColumnHeight, buttonHeight(rightBottomRef), dividerGap)}px`)
  appContainer.style.setProperty('--right-bottom-panel-max-height', `${subSlotMaxHeight(rightColumnHeight, buttonHeight(rightTopRef), dividerGap)}px`)
}

export function useLayoutMeasurements () {
  const { dispatch, breakpoint, layoutRefs, arePluginsEvaluated, appVisible, isFullscreen } = useApp()
  const { mapSize, isMapReady } = useMap()

  const { bannerRef, mainRef, topRef, topLeftColRef, topRightColRef, bottomRef, bottomRightRef, leftTopRef, leftBottomRef, rightTopRef, rightBottomRef, drawerRef, actionsRef } = layoutRefs

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
  useResizeObserver([bannerRef, mainRef, topRef, topLeftColRef, topRightColRef, actionsRef, bottomRef, bottomRightRef, leftTopRef, leftBottomRef, rightTopRef, rightBottomRef, drawerRef], () => {
    requestAnimationFrame(() => {
      calculateLayout(layoutRefs)
    })
  })
}
