import { useEffect, useRef } from 'react'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { EVENTS as events } from '../../config/events.js'

export const getGeometryType = (geojson) => {
  if (!geojson) {
    return null
  }
  if (geojson.type === 'Feature') {
    return geojson.geometry?.type
  }
  return geojson.type
}

const isPointGeometry = (geojson) => {
  const type = getGeometryType(geojson)
  return type === 'Point' || type === 'MultiPoint'
}

export const getPointCoordinates = (geojson) => {
  if (geojson.type === 'Feature') {
    return getPointCoordinates(geojson.geometry)
  }
  if (geojson.type === 'Point') {
    return geojson.coordinates
  }
  if (geojson.type === 'MultiPoint') {
    return geojson.coordinates[0]
  }
  return null
}

export const useVisibleGeometry = () => {
  const { id, mapProvider, eventBus } = useConfig()
  const { layoutRefs, panelConfig, panelRegistry, breakpoint } = useApp()

  const latestRef = useRef({ layoutRefs, panelConfig, panelRegistry, breakpoint })
  latestRef.current = { layoutRefs, panelConfig, panelRegistry, breakpoint }

  useEffect(() => {
    if (!mapProvider || !eventBus) {
      return undefined
    }

    const handlePanelOpened = ({ panelId, visibleGeometry: eventVisibleGeometry }) => {
      const { panelConfig: config, panelRegistry: registry } = latestRef.current
      const resolvedConfig = config?.[panelId] ? config : (registry?.getPanelConfig() ?? config)
      const visibleGeometry = eventVisibleGeometry ?? resolvedConfig?.[panelId]?.visibleGeometry
      const panel = layoutRefs.appContainerRef.current?.querySelector(`#${id}-panel-${panelId}`)

      if (!visibleGeometry) {
        return
      }
      if (typeof mapProvider.isGeometryObscured !== 'function') {
        return
      }

      const waitForPanel = () => {
        if (!panel) { return }
        const panelRect = panel.getBoundingClientRect()

        if (!panelRect || panelRect.width === 0 || panelRect.height === 0) {
          // Not ready yet, check on the next animation frame
          requestAnimationFrame(waitForPanel)
          return
        }

        // Panel now exists and has size, safe to measure
        if (!mapProvider.isGeometryObscured(visibleGeometry, panelRect)) {
          return
        }

        if (isPointGeometry(visibleGeometry)) {
          const center = getPointCoordinates(visibleGeometry)
          if (center) {
            mapProvider.setView({ center })
          }
        } else {
          mapProvider.fitToBounds(visibleGeometry)
        }
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
