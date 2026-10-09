import { useEffect, useRef, useState } from 'react'
import { createMenu } from './createMenu.js'
import { attachPluginStateRef } from '../registry/isVisibleWhen.js'
import { updateUrl } from './updateUrl.js'

// additional possible params here are: appState, mapProvider,
export function MenuInit ({ pluginConfig, pluginState, mapState, services }) {
  const { dispatch } = pluginState
  const { eventBus } = services
  const [urlParsed, setUrlParsed] = useState(false)

  const pluginStateRef = useRef(pluginState)
  pluginStateRef.current = pluginState

  useEffect(() => {
    if (!mapState.isMapReady) {
      return () => {}
    }
    attachPluginStateRef(pluginStateRef)
    const { menu } = pluginConfig
    // createMenu parses the url and combines the url parameters with the dataset defaults
    // that are passed to the plugin as 'menu: {...}'
    const teardown = createMenu({ menu, eventBus, dispatch, pluginStateRef })
    setUrlParsed(true)
    return teardown
  }, [mapState.isMapReady])

  // Notify any plugins, that are listening, to the menu's state change
  // and update the url to reflect the new menu state
  useEffect(() => {
    eventBus.emit('menu:changed', pluginState.menuState)
    if (urlParsed) { // Don't update the url until we have 1st parsed the url and initialised the menu
      updateUrl(pluginState)
    }
  }, [pluginState.menuState])
}
