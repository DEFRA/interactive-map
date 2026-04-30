// src/App/store/ServiceProvider.jsx
import React, { createContext, useMemo, useRef } from 'react'
import { createAnnouncer } from '../../services/announcer.js'
import { createHintManager } from '../../services/hintManager.js'
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
  const hintManager = useMemo(() => createHintManager(announce), [announce])

  symbolRegistry.setDefaults(constructorSymbolDefaults || {})

  const services = useMemo(() => ({
    announce,
    hint: (html, options) => hintManager.hint(html, options),
    hintManager,
    reverseGeocode: (zoom, center) => reverseGeocode(zoom, center),
    eventBus,
    mapStatusRef,
    closeApp: () => closeApp(id, handleExitClick, eventBus),
    symbolRegistry,
    patternRegistry
  }), [announce, hintManager])

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  )
}
