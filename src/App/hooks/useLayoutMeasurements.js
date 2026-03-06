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

const calcOffsetLeft = (bottomOffsetTop, gap, insetBottom, inset) =>
  bottomOffsetTop - gap > insetBottom ? 0 : inset.offsetLeft + inset.offsetWidth

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
    insetRef,
    footerRef,
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
    const inset = insetRef.current
    const bottom = footerRef.current
    const actions = actionsRef.current

    if ([main, top, inset, bottom].some(r => !r)) {
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
    const rightOffsetTop = topRightCol.offsetHeight + top.offsetTop
    const rightColumnHeight = bottom.offsetTop - rightOffsetTop - dividerGap
    appContainer.style.setProperty('--right-offset-top', `${rightOffsetTop}px`)
    appContainer.style.setProperty('--right-offset-bottom', `${main.offsetHeight - bottom.offsetTop + dividerGap}px`)
    appContainer.style.setProperty('--right-top-max-height', `${rightColumnHeight}px`)

    // === Sub-slot panel max-heights ===
    appContainer.style.setProperty('--left-top-panel-max-height', `${subSlotMaxHeight(leftColumnHeight, buttonHeight(leftBottomRef), dividerGap)}px`)
    appContainer.style.setProperty('--left-bottom-panel-max-height', `${subSlotMaxHeight(leftColumnHeight, buttonHeight(leftTopRef), dividerGap)}px`)
    appContainer.style.setProperty('--right-top-panel-max-height', `${subSlotMaxHeight(rightColumnHeight, buttonHeight(rightBottomRef), dividerGap)}px`)
    appContainer.style.setProperty('--right-bottom-panel-max-height', `${subSlotMaxHeight(rightColumnHeight, buttonHeight(rightTopRef), dividerGap)}px`)

    // === Bottom left offset ===
    appContainer.style.setProperty('--offset-left', `${calcOffsetLeft(Math.min(bottom.offsetTop, actions.offsetTop), dividerGap, inset.offsetHeight + leftOffsetTop, inset)}px`)
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
  useResizeObserver([bannerRef, mainRef, topRef, topLeftColRef, topRightColRef, actionsRef, footerRef, leftTopRef, leftBottomRef, rightTopRef, rightBottomRef], () => {
    requestAnimationFrame(() => {
      calculateLayout()
    })
  })
}
