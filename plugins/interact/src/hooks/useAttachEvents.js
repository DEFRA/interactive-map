import { useEffect, useRef } from 'react'
import { EVENTS } from '../../../../src/config/events.js'
import { attachEvents } from '../events.js'

export function useAttachEvents ({ pluginState, appState, mapState, buttonConfig, eventBus, handleInteraction }) {
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
      clickReadyRef
    })

    return cleanupEvents
  }, [pluginState.enabled, buttonConfig, eventBus])

  // crossHair is dispatch-managed state (mapReducer.js's UPDATE_CROSS_HAIR spreads into a NEW
  // object every time — see updateCrossHair in mapActionsMap.js, which fires constantly, e.g.
  // on every fixAtCenter()/hide()), so a `.activate` assignment made only once (inside the
  // effect above, whose deps don't include it) would silently end up on a stale, discarded
  // object the moment the next dispatch replaces it — exactly what CrossHair.jsx's onClick
  // would then find nothing on. Keyed on mapState.crossHair itself, separate from the effect
  // above, so this re-wires onto the current object every time it's replaced, not just once.
  useEffect(() => {
    if (!pluginState.enabled) {
      return undefined
    }
    const activate = () => handleInteractionRef.current(mapState.crossHair.getDetail())
    mapState.crossHair.activate = activate
    return () => {
      if (mapState.crossHair.activate === activate) {
        mapState.crossHair.activate = null
      }
    }
  }, [pluginState.enabled, mapState.crossHair])
}
