// src/App/store/ServiceProvider.jsx
import React, { createContext, useMemo, useRef } from 'react'
import { EVENTS } from '../../config/events.js'
import { createAnnouncer } from '../../services/announcer.js'
import { reverseGeocode } from '../../services/reverseGeocode.js'
import { useConfig } from '../store/configContext.js'
import { closeApp } from '../../services/closeApp.js'
import { logger } from '../../services/logger.js'
import { symbolRegistry } from '../../services/symbolRegistry.js'

export const ServiceContext = createContext(null)

export const ServiceProvider = ({ eventBus, children }) => {
  const { id, handleExitClick, symbolDefaults: constructorSymbolDefaults } = useConfig()
  const mapStatusRef = useRef(null)
  const announce = useMemo(() => createAnnouncer(mapStatusRef), [])

  symbolRegistry.setDefaults(constructorSymbolDefaults || {})

  const services = useMemo(() => ({
    announce,
    reverseGeocode: (zoom, center) => reverseGeocode(zoom, center),
    events: EVENTS,
    eventBus,
    mapStatusRef,
    closeApp: () => closeApp(id, handleExitClick, eventBus),
    logger,
    symbolRegistry
  }), [announce])

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  )
}
