import { useLayoutEffect } from 'react'
import { useResizeObserver } from './useResizeObserver.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { getSafeZoneInset } from '../../utils/getSafeZoneInset.js'

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

    if (!main || !top || !inset || !bottom) {
      return
    }

    const root = document.documentElement
    const styles = getComputedStyle(root)
    const dividerGap = Number.parseInt(styles.getPropertyValue('--divider-gap'), 10)

    // === Top column width ===
    const leftWidth = topLeftCol.offsetWidth || 0
    const rightWidth = topRightCol.offsetWidth || 0
    const finalWidth = leftWidth || rightWidth ? Math.max(leftWidth, rightWidth) : 0
    appContainer.style.setProperty('--top-col-width', `${finalWidth}px`)

    // === Left container offsets ===
    const leftOffsetTop = topLeftCol.offsetHeight + top.offsetTop
    const leftOffsetBottom = main.offsetHeight - bottom.offsetTop + dividerGap
    appContainer.style.setProperty('--left-offset-top', `${leftOffsetTop}px`)
    appContainer.style.setProperty('--left-offset-bottom', `${leftOffsetBottom}px`)
    const leftColumnHeight = bottom.offsetTop - leftOffsetTop - dividerGap
    appContainer.style.setProperty('--left-top-max-height', `${leftColumnHeight}px`)

    // === Right container offsets ===
    const rightOffsetTop = topRightCol.offsetHeight + top.offsetTop
    const rightOffsetBottom = main.offsetHeight - bottom.offsetTop + dividerGap
    appContainer.style.setProperty('--right-offset-top', `${rightOffsetTop}px`)
    appContainer.style.setProperty('--right-offset-bottom', `${rightOffsetBottom}px`)
    const rightColumnHeight = bottom.offsetTop - rightOffsetTop - dividerGap
    appContainer.style.setProperty('--right-top-max-height', `${rightColumnHeight}px`)

    // === Sub-slot panel max-heights ===
    // Panel max-height = column height minus the sibling's button height (and a gap if non-zero)
    const leftTopButtons = leftTopRef.current?.offsetHeight ?? 0
    const leftBottomButtons = leftBottomRef.current?.offsetHeight ?? 0
    appContainer.style.setProperty('--left-top-panel-max-height', `${leftColumnHeight - (leftBottomButtons ? leftBottomButtons + dividerGap : 0)}px`)
    appContainer.style.setProperty('--left-bottom-panel-max-height', `${leftColumnHeight - (leftTopButtons ? leftTopButtons + dividerGap : 0)}px`)

    const rightTopButtons = rightTopRef.current?.offsetHeight ?? 0
    const rightBottomButtons = rightBottomRef.current?.offsetHeight ?? 0
    appContainer.style.setProperty('--right-top-panel-max-height', `${rightColumnHeight - (rightBottomButtons ? rightBottomButtons + dividerGap : 0)}px`)
    appContainer.style.setProperty('--right-bottom-panel-max-height', `${rightColumnHeight - (rightTopButtons ? rightTopButtons + dividerGap : 0)}px`)

    // === Bottom left offset ===
    const insetBottom = inset.offsetHeight + leftOffsetTop
    const bottomOffsetTop = Math.min(bottom.offsetTop, actions.offsetTop)
    const bottomOffsetLeft = bottomOffsetTop - dividerGap > insetBottom ? 0 : inset.offsetLeft + inset.offsetWidth
    appContainer.style.setProperty('--offset-left', `${bottomOffsetLeft}px`)
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
