import { useEffect, useRef } from 'react'
import { createMenu } from './createMenu.js'
import { attachPluginStateRef } from '../registry/isVisibleWhen.js'

// additional possible params here are: appState, mapProvider,
export function MenuInit ({ pluginConfig, pluginState, mapState, services }) {
  const { dispatch } = pluginState
  const { eventBus } = services

  const pluginStateRef = useRef(pluginState)
  pluginStateRef.current = pluginState

  useEffect(() => {
    if (!mapState.isMapReady) {
      return () => {}
    }
    attachPluginStateRef(pluginStateRef)
    const { menu } = pluginConfig
    return createMenu({ menu, eventBus, dispatch, pluginStateRef })
  }, [mapState.isMapReady])

  // Notify any plugins, that are listening to the menu's state
  useEffect(() => eventBus.emit('menu:changed'), [pluginState.menuState])

  // When the menuState changes, we need to trigger (in the datasets plugin):
  //   invalidateKeyItems
  //   applyGlobalVisibility
}
