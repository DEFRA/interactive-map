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
    const { remove } = createMenu({ menu, eventBus, dispatch })
    return remove
  }, [mapState.isMapReady])

  // useEffect(() => {
  //   console.log('calling setMenuState')
  //   setMenuState(pluginState.menuState)
  //   // datasetRegistry.invalidateKeyItems()
  // }, [pluginState.menuState])
}
