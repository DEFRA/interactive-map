import { useEffect, useRef } from 'react'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { useEvaluateProp } from './useEvaluateProp.js'
import { EVENTS as events } from '../../config/events.js'
import { getMapSizeScale } from '../../config/mapSizeScales.js'
import { MAP_PANEL_SLOT_REFS } from '../../config/mapPanelSlots.js'
import { getPanelElementId } from '../../utils/getPanelElementId.js'
import { getScreenBox, getRelativeBox, isOverlapping } from '../../utils/screenBox.js'

// Only panels over the map can hide the geometry
const isOverMap = (panel, layoutRefs) => MAP_PANEL_SLOT_REFS.some(refName => layoutRefs[refName]?.current?.contains(panel))

// Whether any of the geometry's bounding box is under the panel, both measured relative to the viewport
const isUnderPanel = ({ visibleGeometry, panelRect, mapProvider, viewport, mapSize }) => {
  if (!viewport) {
    return false
  }
  const box = getScreenBox(visibleGeometry, (coords) => mapProvider.mapToScreen(coords), getMapSizeScale(mapSize))
  return isOverlapping(box, getRelativeBox(panelRect, viewport.getBoundingClientRect()))
}

export const useVisibleGeometry = () => {
  const { id, mapProvider, eventBus } = useConfig()
  const { layoutRefs, panelConfig, panelRegistry } = useApp()
  const { mapSize } = useMap()
  const evaluateProp = useEvaluateProp()

  // Read in the event handler, so it uses the latest of each, not the first render's
  const latestRef = useRef({ panelConfig, panelRegistry, mapSize, evaluateProp })
  latestRef.current = { panelConfig, panelRegistry, mapSize, evaluateProp }

  useEffect(() => {
    if (!mapProvider || !eventBus) {
      return undefined
    }

    const handlePanelOpened = ({ panelId, ...openedOptions }) => {
      const { panelConfig: config, panelRegistry: registry, evaluateProp: evaluate } = latestRef.current
      const resolvedConfig = config?.[panelId] ? config : (registry?.getPanelConfig() ?? config)
      // A panel that opens as it's added sends its options with the event, as the registry may not
      // have them yet. visibleGeometry can be a function of the context, like a panel's label
      const { visibleGeometry: geometryOption, preferPan = true, paddingPercent, pluginId } = { ...resolvedConfig?.[panelId], ...openedOptions }
      const visibleGeometry = evaluate(geometryOption, pluginId)
      const panel = layoutRefs.appContainerRef.current?.querySelector(`#${getPanelElementId(id, panelId)}`)

      if (!visibleGeometry) {
        return
      }

      const waitForPanel = () => {
        if (!panel || !isOverMap(panel, layoutRefs)) { return }
        const panelRect = panel.getBoundingClientRect()

        if (!panelRect || panelRect.width === 0 || panelRect.height === 0) {
          // Not ready yet, check on the next animation frame
          requestAnimationFrame(waitForPanel)
          return
        }

        // Only move the map when the panel opens over the geometry. Once the user has moved the
        // map, a geometry elsewhere or off screen is theirs to come back to.
        const viewport = layoutRefs.viewportRef?.current
        if (!isUnderPanel({ visibleGeometry, panelRect, mapProvider, viewport, mapSize: latestRef.current.mapSize })) {
          return
        }

        // The panel has a size, so the safe zone now allows for it. With preferPan, the map pans
        // to centre the geometry in the safe zone, only zooming out if it doesn't fit.
        mapProvider.fitToBounds(visibleGeometry, { preferPan, paddingPercent })
      }

      // Start waiting for panel to exist with a measurable size
      requestAnimationFrame(waitForPanel)
    }

    eventBus.on(events.APP_PANEL_OPENED, handlePanelOpened)

    return () => {
      eventBus.off(events.APP_PANEL_OPENED, handlePanelOpened)
    }
  }, [mapProvider, eventBus])
}
