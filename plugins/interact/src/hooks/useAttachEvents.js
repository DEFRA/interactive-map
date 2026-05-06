import { useEffect, useRef } from 'react'
import { EVENTS } from '../../../../src/config/events.js'
import { attachEvents } from '../events.js'

export function useAttachEvents ({ pluginState, appState, mapState, buttonConfig, eventBus, handleInteraction, closeApp }) {
  // Refs updated synchronously each render — keeps callbacks fresh without re-attaching events
  const handleInteractionRef = useRef(handleInteraction)
  handleInteractionRef.current = handleInteraction

  const pluginStateRef = useRef(pluginState)
  pluginStateRef.current = pluginState

  const appStateRef = useRef(appState)
  appStateRef.current = appState

  // Defer click handling by one macrotask so any click that triggered the enable
  // (e.g. finishing a draw gesture) fires before this handler is live.
  // Managed separately from attachEvents so re-runs of that effect don't reset it —
  // only resets when enabled actually changes.
  const clickReadyRef = useRef(false)
  useEffect(() => {
    clickReadyRef.current = false
    const timer = setTimeout(() => { clickReadyRef.current = true }, 0)
    return () => clearTimeout(timer)
  }, [pluginState.enabled])

  useEffect(() => {
    if (!pluginState.enabled) {
      return undefined
    }

    const cleanupEvents = attachEvents({
      getAppState: () => appStateRef.current,
      mapState,
      getPluginState: () => pluginStateRef.current,
      buttonConfig,
      events: EVENTS,
      eventBus,
      handleInteraction: (event) => handleInteractionRef.current(event),
      clickReadyRef,
      closeApp
    })

    return cleanupEvents
  }, [pluginState.enabled, buttonConfig, eventBus, closeApp])
}
