import { useCallback, useEffect } from 'react'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { useService } from '../store/serviceContext.js'
import { scaleFactor } from '../../config/appConfig.js'
import { EVENTS as events } from '../../config/events.js'

const assignCrossHairAPI = (crossHair, el, mapProvider, dispatch, updatePosition) => {
  crossHair.pinToMap = (coords, state) => {
    const { x, y } = mapProvider.mapToScreen(coords)
    crossHair.coords = coords
    dispatch({ type: 'UPDATE_CROSS_HAIR', payload: { isPinnedToMap: true, isVisible: true, coords, state } })
    updatePosition(el, x, y)
  }

  crossHair.fixAtCenter = () => {
    el.style.left = '50%'
    el.style.top = '50%'
    el.style.transform = 'translate(0,0)'
    el.style.display = 'block'
    dispatch({ type: 'UPDATE_CROSS_HAIR', payload: { isPinnedToMap: false, isVisible: true } })
  }

  crossHair.remove = () => {
    el.style.display = 'none'
    dispatch({ type: 'UPDATE_CROSS_HAIR', payload: { isPinnedToMap: false, isVisible: false } })
  }

  crossHair.show = () => {
    el.style.display = 'block'
    dispatch({ type: 'UPDATE_CROSS_HAIR', payload: { isVisible: true } })
  }

  // Fully hidden — display:none, not just faded — rather than staying in the accessibility
  // tree while invisible. An earlier version kept it ax-tree-present here so Voice Control
  // could re-summon it by name, but that made "Show Names" put a "Target" label over
  // nothing whenever it was genuinely hidden, which is more confusing than helpful. Voice
  // Control's real route back is opening MoveControls (a normal, always-visible, always-named
  // button) — see isMoveControlsOpen below — so the crosshair itself doesn't need to stay
  // discoverable while it's not actually there. Blocked outright while MoveControls is open:
  // that panel is a deliberate, explicit "I can't drag/pinch this map" signal from the user,
  // which should win over whatever mouse-vs-touch/keyboard inference would otherwise decide.
  crossHair.hide = () => {
    if (crossHair.isMoveControlsOpen) {
      return
    }
    el.style.display = 'none'
    dispatch({ type: 'UPDATE_CROSS_HAIR', payload: { isVisible: false } })
  }

  crossHair.setStyle = (state) => {
    dispatch({ type: 'UPDATE_CROSS_HAIR', payload: { state } })
  }

  crossHair.getDetail = () => {
    const coords = crossHair.isPinnedToMap ? crossHair.coords : mapProvider.getCenter()

    return {
      state: crossHair.state,
      point: mapProvider.mapToScreen(coords),
      zoom: mapProvider.getZoom(),
      coords
    }
  }
}

export const useCrossHair = () => {
  const { mapProvider } = useConfig()
  const { safeZoneInset, expandedButtons } = useApp()
  const { eventBus } = useService()
  const { crossHair, dispatch, mapSize } = useMap()

  const updatePosition = (el, x, y) => {
    if (!safeZoneInset) {
      return
    }
    const scaled = { x: x * scaleFactor[mapSize], y: y * scaleFactor[mapSize] }
    el.style.transform = `translate(${scaled.x - safeZoneInset.left}px, ${scaled.y - safeZoneInset.top}px)`
    el.style.left = '0'
    el.style.top = '0'
    el.style.display = 'block'
  }

  const crossHairRef = useCallback(el => {
    if (!el) {
      return undefined
    }

    assignCrossHairAPI(crossHair, el, mapProvider, dispatch, updatePosition)

    const handleRender = () => {
      if (crossHair.coords && crossHair.isPinnedToMap) {
        const { x, y } = mapProvider.mapToScreen(crossHair.coords)
        updatePosition(el, x, y)
      }
    }

    eventBus.on(events.MAP_RENDER, handleRender)

    return () => {
      eventBus.off(events.MAP_RENDER, handleRender)
    }
  }, [crossHair, mapProvider, mapSize, dispatch, safeZoneInset])

  useEffect(() => {
    if (crossHair.coords && crossHair.isPinnedToMap) {
      // Call again on size change
      crossHair.pinToMap(crossHair.coords, crossHair.state)
    }
  }, [mapSize])

  // A plain property on the shared crossHair object, not dispatched state — every owner
  // (draw's per-adapter modes, interact's useCrossHairVisibility) already holds this same
  // object, so mutating it here is all that's needed for hide()'s own guard above to see the
  // current value live, however long ago it was last set. This alone never shows or hides
  // anything by itself — it only ever blocks a hide() call already in flight — so it's safe to
  // run unconditionally even when no plugin that cares about it is loaded at all.
  //
  // Deliberately NOT a useEffect: this component's own effects and interact's/draw's own
  // updateCrossHair effects both react to the same expandedButtons change, and React gives no
  // ordering guarantee between two different components' effects — if the consumer's effect
  // (which decides to call hide()) ran before this one updated the flag, hide()'s guard would
  // read the stale value and incorrectly block itself. Setting it directly in the render body
  // (matches DrawInit.jsx's shouldShowCrosshairRef convention) guarantees it's current before
  // ANY component's effects run, since React finishes rendering the whole tree first.
  crossHair.isMoveControlsOpen = expandedButtons?.has('moveControls')

  return {
    crossHair,
    crossHairRef
  }
}
