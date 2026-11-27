import { useEffect, useRef } from 'react'
import { isBelowSnapMinZoom, getSnapHintText } from '../utils/snapMinZoom.js'

/**
 * Stops the adapter snapping below snapMinZoom, keeping the user's on/off choice. When the user
 * has snap on and their own zoom takes the map below it during a draw or edit, a hint tells them
 * to zoom in. Zooms made by code never show the hint.
 */
export function useSnapMinZoom ({ mapState, pluginConfig, pluginState, mapProvider, hints }) {
  const { zoom, isUserMove } = mapState
  const { mode, hasSnapLayers, snap } = pluginState
  const draw = mapProvider.draw
  const isBelow = isBelowSnapMinZoom(pluginConfig, zoom)
  const previousRef = useRef({ mode: null, isBelow: false })

  useEffect(() => {
    if (!draw) {
      return
    }
    const previous = previousRef.current
    previousRef.current = { mode, isBelow }
    draw.setSnapAvailable(!isBelow)

    const isZoomInSession = !!mode && previous.mode === mode && hasSnapLayers
    if (isBelow && !previous.isBelow && isZoomInSession && snap && isUserMove) {
      hints.show(getSnapHintText(pluginConfig))
    }
  }, [draw, mode, isBelow])
}
