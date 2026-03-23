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

export function useLayoutMeasurements () {
  const { dispatch, breakpoint, layoutRefs } = useApp()
  const { mapSize, isMapReady } = useMap()

  const {
    appContainerRef,
    mainRef,
    bannerRef,
    topRef,
    topLeftColRef,
    topRightColRef,
    bottomRef,
    bottomRightRef,
    actionsRef,
    leftTopRef,
    leftBottomRef,
    rightTopRef,
    rightBottomRef
  } = layoutRefs

  // -----------------------------
  // 1. Calculate layout CSS vars (side effect)
  // -----------------------------
  const calculateLayout = () => {
    const appContainer = appContainerRef.current
    const main = mainRef.current
    const top = topRef.current
    const topLeftCol = topLeftColRef.current
    const topRightCol = topRightColRef.current
    const bottom = bottomRef.current

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
    const rightOffsetBottom = Math.max(bottomRightHeight, dividerGap) + bottomContainerPad + dividerGap
    appContainer.style.setProperty('--right-offset-top', `${rightOffsetTop}px`)
    appContainer.style.setProperty('--right-offset-bottom', `${rightOffsetBottom}px`)
    appContainer.style.setProperty('--right-top-max-height', `${rightColumnHeight}px`)

    // === Sub-slot panel max-heights ===
    appContainer.style.setProperty('--left-top-panel-max-height', `${subSlotMaxHeight(leftColumnHeight, buttonHeight(leftBottomRef), dividerGap)}px`)
    appContainer.style.setProperty('--left-bottom-panel-max-height', `${subSlotMaxHeight(leftColumnHeight, buttonHeight(leftTopRef), dividerGap)}px`)
    appContainer.style.setProperty('--right-top-panel-max-height', `${subSlotMaxHeight(rightColumnHeight, buttonHeight(rightBottomRef), dividerGap)}px`)
    appContainer.style.setProperty('--right-bottom-panel-max-height', `${subSlotMaxHeight(rightColumnHeight, buttonHeight(rightTopRef), dividerGap)}px`)
  }

  // --------------------------------
  // 2. Run when breakpoint and mapSize change
  // --------------------------------
  useLayoutEffect(() => {
    requestAnimationFrame(() => { // Required for Preact
      calculateLayout()

      // === Set safe zone inset ===
      const safeZoneInset = getSafeZoneInset(layoutRefs)
      dispatch({ type: 'SET_SAFE_ZONE_INSET', payload: { safeZoneInset } })
    })
  }, [breakpoint, mapSize, isMapReady])

  // --------------------------------
  // 3. Recaluclate CSS vars when elements resize
  // --------------------------------
  useResizeObserver([bannerRef, mainRef, topRef, topLeftColRef, topRightColRef, actionsRef, bottomRef, bottomRightRef, leftTopRef, leftBottomRef, rightTopRef, rightBottomRef], () => {
    requestAnimationFrame(() => {
      calculateLayout()
    })
  })
}
