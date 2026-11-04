import { useEffect, useRef } from 'react'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { EVENTS as events } from '../../config/events.js'
import { getSafeZoneInset, getOpenPanelBoxes } from '../../utils/getSafeZoneInset.js'
import { calculateLayout } from './useLayoutMeasurements.js'
import { scalePoints } from '../../utils/scalePoints.js'
import { getMapSizeScale } from '../../config/mapSizeScales.js'
import { SIDE_PANEL_SLOT_REFS } from '../../config/mapPanelSlots.js'
import { getFitMove } from '../../utils/getFitMove.js'
import { getScreenBox, getBoxCenter } from '../../utils/screenBox.js'

const FIT_WITHOUT_MARGIN = { type: 'fit' }

// fitToBounds' second argument was the boolean skipPaddingCalc, still accepted
const toFitOptions = (options) => typeof options === 'boolean' ? { skipPaddingCalc: options } : (options ?? {})

const hasMargin = (margin) => Object.values(margin).some(value => value > 0)

// The open side panels, relative to the viewport. The safe zone leaves out small ones, so they
// are checked separately. Drawer panels are always within the safe zone.
const getPanelBoxes = (layoutRefs, viewport) => {
  const origin = viewport.getBoundingClientRect()
  return SIDE_PANEL_SLOT_REFS.flatMap(refName => getOpenPanelBoxes(layoutRefs[refName], origin))
}

// Turns a move worked out in CSS pixels into one the map can make. A pan becomes the coordinate to
// centre in the safe zone: whatever is that far from its centre now. A fit's margin goes into map
// pixels, which differ from CSS pixels at the larger map sizes.
const toMapMove = (move, { safeZone, mapProvider, scale }) => {
  if (move.type === 'pan') {
    const [offsetX, offsetY] = move.offset
    const [safeZoneX, safeZoneY] = getBoxCenter(safeZone)
    const center = mapProvider.screenToMap({ x: (safeZoneX + offsetX) / scale, y: (safeZoneY + offsetY) / scale })
    return { type: 'pan', center }
  }
  if (move.type === 'fit') {
    return hasMargin(move.margin) ? { type: 'fit', margin: scalePoints(move.margin, scale) } : FIT_WITHOUT_MARGIN
  }
  return move
}

// Works in CSS pixels relative to the viewport, where the safe zone is measured
const getMove = ({ bounds, safeZoneInset, mapProvider, layoutRefs, mapSize, preferPan, paddingPercent }) => {
  const viewport = layoutRefs.viewportRef?.current
  if (!safeZoneInset || !viewport || (!preferPan && !paddingPercent)) {
    return FIT_WITHOUT_MARGIN
  }

  const scale = getMapSizeScale(mapSize)
  const safeZone = {
    left: safeZoneInset.left,
    top: safeZoneInset.top,
    right: viewport.offsetWidth - safeZoneInset.right,
    bottom: viewport.offsetHeight - safeZoneInset.bottom
  }
  const box = preferPan ? getScreenBox(bounds, (coords) => mapProvider.mapToScreen(coords), scale) : undefined
  const panels = preferPan ? getPanelBoxes(layoutRefs, viewport) : []
  return toMapMove(getFitMove({ box, safeZone, panels, preferPan, paddingPercent }), { safeZone, mapProvider, scale })
}

// Forward public API events to the (overridden) mapProvider methods so that
// interactiveMap.fitToBounds() and interactiveMap.setView() respect safe zone padding.
// fitToBounds' options are passed through.
const useForwardMapEvents = (mapProvider, eventBus) => {
  useEffect(() => {
    if (!mapProvider || !eventBus) {
      return undefined
    }

    const handleFitToBounds = (bounds, options) => mapProvider.fitToBounds(bounds, options)
    const handleSetView = (opts) => mapProvider.setView(opts)

    eventBus.on(events.MAP_FIT_TO_BOUNDS, handleFitToBounds)
    eventBus.on(events.MAP_SET_VIEW, handleSetView)

    return () => {
      eventBus.off(events.MAP_FIT_TO_BOUNDS, handleFitToBounds)
      eventBus.off(events.MAP_SET_VIEW, handleSetView)
    }
  }, [mapProvider, eventBus])
}

export const useMapProviderOverrides = () => {
  const { mapProvider, eventBus } = useConfig()
  const { dispatch: appDispatch, layoutRefs, breakpoint } = useApp()
  const { mapSize } = useMap()

  const latestMapSize = useRef(mapSize)
  latestMapSize.current = mapSize
  const latestBreakpoint = useRef(breakpoint)
  latestBreakpoint.current = breakpoint

  // Refresh the derived layout CSS vars (e.g. --left-offset-top) before reading them —
  // callers often trigger this right after a state change that resizes the header/columns
  // (e.g. collapsing mobile search), and those vars are only otherwise refreshed by a
  // separate ResizeObserver callback that isn't guaranteed to have run yet.
  const measureSafeZone = () => {
    calculateLayout(layoutRefs, latestBreakpoint.current)
    return getSafeZoneInset(layoutRefs)
  }

  // Stores the safe zone, which positions the crosshair, and sets it as the map's padding, which
  // sets the map's centre, together so they always match. Only called just before the map moves.
  const applySafeZone = (safeZoneInset) => {
    if (!safeZoneInset) {
      return
    }
    if (typeof appDispatch === 'function') {
      appDispatch({
        type: 'SET_SAFE_ZONE_INSET',
        payload: { safeZoneInset, syncMapPadding: false }
      })
    }
    if (typeof mapProvider.setPadding === 'function') {
      mapProvider.setPadding(scalePoints(safeZoneInset, getMapSizeScale(latestMapSize.current)))
    }
  }

  useEffect(() => {
    if (!mapProvider) {
      return undefined
    }

    const originalFitToBounds = mapProvider.fitToBounds
    const originalSetView = mapProvider.setView

    mapProvider.fitToBounds = (bounds, options) => {
      if (!bounds) {
        return undefined
      }

      const { skipPaddingCalc = false, preferPan = false, paddingPercent } = toFitOptions(options)

      if (skipPaddingCalc) {
        return originalFitToBounds.call(mapProvider, bounds)
      }

      // Callers often dispatch layout-affecting state (e.g. collapsing the mobile search
      // form) immediately before calling this, so measuring on the same tick can capture
      // the DOM mid-transition. Wait a frame so React has painted first.
      requestAnimationFrame(() => {
        const safeZoneInset = measureSafeZone()
        const move = getMove({ bounds, safeZoneInset, mapProvider, layoutRefs, mapSize: latestMapSize.current, preferPan, paddingPercent })

        // Nothing moves, so the stored safe zone and the padding are left as they are, together.
        // Changing the padding moves the map's centre, which would be announced as a move.
        if (move.type === 'none') {
          return
        }

        // Set the padding first, as the move uses it. The map is only redrawn once the move starts.
        applySafeZone(safeZoneInset)
        if (move.type === 'pan') {
          originalSetView.call(mapProvider, { center: move.center })
        } else if (move.margin) {
          originalFitToBounds.call(mapProvider, bounds, { padding: move.margin })
        } else {
          originalFitToBounds.call(mapProvider, bounds)
        }
      })
      return undefined
    }

    mapProvider.setView = ({ center, zoom }) => {
      if (!center) {
        return undefined
      }

      requestAnimationFrame(() => {
        applySafeZone(measureSafeZone())
        originalSetView.call(mapProvider, { center, zoom })
      })
      return undefined
    }

    return () => {
      mapProvider.fitToBounds = originalFitToBounds
      mapProvider.setView = originalSetView
    }
  }, [mapProvider, appDispatch, layoutRefs, mapSize])

  useForwardMapEvents(mapProvider, eventBus)
}
