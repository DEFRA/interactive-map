import { useEffect } from 'react'
import { attachEvents } from './events.js'
import { createMapboxDraw } from './mapboxDraw.js'

export const DrawInit = ({ appState, appConfig, mapState, pluginConfig, pluginState, services, mapProvider, buttonConfig }) => {
	const { events, eventBus } = services
	const { crossHair } = mapState
	const isTouchOrKeyboard = ['touch', 'keyboard'].includes(appState.interfaceType)

	// Create draw instance once
	useEffect(() => {
		// Don't run init if the app is in non-specified mode
		const inModeWhitelist = pluginConfig.includeModes?.includes(appState.mode) ?? true
		const inExcludeModes = pluginConfig.excludeModes?.includes(appState.mode) ?? false

    if (!mapState.isMapReady || !inModeWhitelist || inExcludeModes) {
      return
    }

    const { remove } = createMapboxDraw({
			mapStyle: mapState.mapStyle,
			snapLayers: pluginConfig.snapLayers,
			mapProvider,
			events,
			eventBus
		})

		// Initialize snap layers flag from config
		pluginState.dispatch({ type: 'SET_HAS_SNAP_LAYERS', payload: pluginConfig.snapLayers?.length > 0 })

		// Draw ready
		eventBus.emit('draw:ready')

		return () => remove()

  }, [mapState.isMapReady, appState.mode])

	// Show crosshair immediately on touch/keyboard when entering draw mode
	useEffect(() => {
		if (['draw_polygon', 'draw_line'].includes(pluginState.mode) && isTouchOrKeyboard) {
			const wasAlreadyVisible = crossHair.isVisible
			crossHair.fixAtCenter()
			return () => {
				if (!wasAlreadyVisible) {
					crossHair.hide()
				}
			}
		}
	}, [pluginState.mode, appState.interfaceType])

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