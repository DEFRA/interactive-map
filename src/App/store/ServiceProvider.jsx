// src/App/store/ServiceProvider.jsx
import React, { createContext, useMemo, useRef } from 'react'
import { createAnnouncer } from '../../services/announcer.js'
import { reverseGeocode } from '../../services/reverseGeocode.js'
import { useConfig } from '../store/configContext.js'
import { closeApp } from '../../services/closeApp.js'
import { symbolRegistry } from '../../services/symbolRegistry.js'
import { patternRegistry } from '../../services/patternRegistry.js'

export const ServiceContext = createContext(null)

export const ServiceProvider = ({ eventBus, children }) => {
  const { id, handleExitClick, symbolDefaults: constructorSymbolDefaults } = useConfig()
  const mapStatusRef = useRef(null)
  const announce = useMemo(() => createAnnouncer(mapStatusRef), [])

  symbolRegistry.setDefaults(constructorSymbolDefaults || {})

  const services = useMemo(() => ({
    announce,
    reverseGeocode: (zoom, center) => reverseGeocode(zoom, center),
    eventBus,
    mapStatusRef,
    closeApp: () => closeApp(id, handleExitClick, eventBus),
    symbolRegistry,
    patternRegistry
  }), [announce])

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  )
}
