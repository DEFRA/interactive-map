import { useEffect } from 'react'
import { attachEvents } from './events.js'
import { createMapboxDraw } from './mapboxDraw.js'

export const DrawInit = ({ appState, appConfig, mapState, pluginConfig, pluginState, services, mapProvider, buttonConfig }) => {
	const { events, eventBus } = services

	// Create draw instance once
	useEffect(() => {
		// Don't run init if the app is in non-specified mode
		const inModeWhitelist = pluginConfig.includeModes?.includes(appState.mode) ?? true
		const inExcludeModes = pluginConfig.excludeModes?.includes(appState.mode) ?? false

    if (!mapState.isMapReady || !inModeWhitelist || inExcludeModes) {
      return
    }

    const { remove } = createMapboxDraw({
			colorScheme: mapState.mapStyle.mapColorScheme,
			snapLayers: pluginConfig.snapLayers,
			mapProvider,
			events,
			eventBus
		})

		// Draw ready
		eventBus.emit('draw:ready')

		return () => remove()

  }, [mapState.isMapReady, appState.mode])

	// Attach events when plgin state changes
	useEffect(() => {
		
		if (!mapProvider.draw) {
			return
		}

		const cleanupEvents = attachEvents({
			appState,
			appConfig,
			mapState,
			mapProvider,
			buttonConfig,
			pluginState,
			events,
			eventBus
		})

		return () => cleanupEvents()

	}, [mapProvider, appState, pluginState])
}