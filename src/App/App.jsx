import React, { useEffect } from 'react'
import { AppProvider } from './store/AppProvider.jsx'
import { MapProvider } from './store/MapProvider.jsx'
import { ServiceProvider } from './store/ServiceProvider.jsx'
import { removeLoadingState } from '..//InteractiveMap/domStateManager.js'
import { PluginProvider } from './store/PluginProvider.jsx'
import { PluginInits } from './renderer/PluginInits.jsx'
import { Layout } from './layout/Layout.jsx'
import { EVENTS as events } from '../config/events.js'

export const App = (props) => {
  useEffect(() => {
    removeLoadingState()
    props.eventBus.emit(events.APP_READY)
  }, [])

  return (
    <AppProvider options={props}>
      <MapProvider options={props}>
        <ServiceProvider eventBus={props.eventBus}>
          <PluginProvider>
            <PluginInits />
            <Layout />
          </PluginProvider>
        </ServiceProvider>
      </MapProvider>
    </AppProvider>
  )
}
