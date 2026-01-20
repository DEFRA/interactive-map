import React, { useRef, useEffect, useState } from 'react'
import { computeInset } from './utils.js'

export function Frame({ appState, mapState, pluginState, mapProvider }) {
  const { actionsRef, mainRef, footerRef, viewportRef } = appState.layoutRefs
  const { dispatch } = pluginState
  const elRef = useRef(null)
  const displayRef = useRef(null)
  const fittedBoundsRef = useRef(null)
  const [parentInset, setParentInset] = useState('65px')
  const [childStyle, setChildStyle] = useState(null)

  // Store refs in pluginState for use in FrameInit (only once on mount)
  useEffect(() => {
    dispatch({
      type: 'SET_FRAME_REFS',
      payload: { displayRef }
    })
  }, [])

  useEffect(() => {
    if (!pluginState.frame || !elRef.current) {
      // Reset fitted bounds ref when frame is removed
      fittedBoundsRef.current = null
      return
    }

    const parent = elRef.current

    const updateLayout = () => {
      if (!actionsRef.current || !mainRef.current || !footerRef.current) {
        return
      }

      // Parent inset
      const mainHeight = mainRef.current.offsetHeight
      const footerTop = footerRef.current.offsetTop
      const actionsTop = actionsRef.current.offsetTop
      const offsetBottom = mainHeight - Math.min(actionsTop, footerTop) + 10
      setParentInset(`65px 65px ${offsetBottom}px 65px`)

      const { offsetWidth: parentWidth, offsetHeight: parentHeight } = parent

      // Flicker prevention
      if (mainHeight - offsetBottom - parent.offsetTop !== parent.offsetHeight) {
        return
      }

      // Compute display inset
      const { top, left, width, height } = computeInset(
        parentWidth,
        parentHeight,
        pluginState.frame,
        appState.breakpoint
      )

      const childTop = top + parent.offsetTop
      const childLeft = left + parent.offsetLeft

      setChildStyle({
        top: `${childTop}px`,
        left: `${childLeft}px`,
        width: `${width}px`,
        height: `${height}px`
      })
    }

    const observer = new ResizeObserver(updateLayout)
    observer.observe(parent)

    updateLayout()

    return () => observer.disconnect()
  }, [pluginState.frame, appState.breakpoint, actionsRef, mainRef, footerRef])

  // Fit bounds after frame is rendered (for editFeature)
  useEffect(() => {
    if (!pluginState.frame?.bounds || !displayRef.current || !viewportRef.current || !childStyle) {
      return
    }

    const frameEl = displayRef.current
    const viewportEl = viewportRef.current

    // Get frame and viewport positions
    const frameRect = frameEl.getBoundingClientRect()
    const viewportRect = viewportEl.getBoundingClientRect()

    // Calculate padding from viewport edges to frame edges
    const scale = {small: 1, medium: 1.5, large: 2}[mapState.mapSize]

    const padding = {
      top: (frameRect.top - viewportRect.top) / scale,
      right: (viewportRect.right - frameRect.right) / scale,
      bottom: (viewportRect.bottom - frameRect.bottom) / scale,
      left: (frameRect.left - viewportRect.left) / scale
    }

    // Set padding first, then fit bounds (skip override's safe zone padding calc)
    mapProvider.setPadding(padding)
    mapProvider.fitToBounds(pluginState.frame.bounds, true)
  }, [pluginState.frame?.bounds, childStyle, mapProvider, displayRef, viewportRef])

  if (!pluginState.frame) {
    return null
  }

  return (
    <>
      {/* Spacer */}
      <div className="im-c-frame-spacer" style={{ inset: parentInset }} ref={elRef} />

      {/* Child */}
      {childStyle && (
        <div ref={displayRef} className="im-c-frame-display" style={{ ...childStyle }} />
      )}
    </>
  )
}
