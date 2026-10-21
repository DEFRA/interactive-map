import { useEffect } from 'react'
import { convertFrameToFeature } from './utils.js'

export const FrameInit = ({
  appState,
  mapState,
  mapProvider,
  pluginConfig,
  pluginState,
  services,
  buttonConfig
}) => {
  const { breakpoint, layoutRefs } = appState
  const { eventBus } = services
  const { frameDone, frameCancel } = buttonConfig
  const { dispatch, frameRefs, frame } = pluginState

  // Check if plugin should be active
  const isActive = mapState.isMapReady

  // Attach events
  useEffect(() => {
    if (!isActive) {
      return
    }

    // --- Done
    frameDone.onClick = () => {
      const feature = convertFrameToFeature({
        frameEl: frameRefs.displayRef.current,
        viewportEl: layoutRefs.viewportRef.current,
        featureId: frame?.featureId,
        scale: { small: 1, medium: 1.5, large: 2 }[mapState.mapSize],
        mapProvider
      })

      dispatch({ type: 'SET_FRAME', payload: null })
      eventBus.emit('frame:done', feature)
    }

    // --- Cancel
    frameCancel.onClick = () => {
      dispatch({ type: 'SET_FRAME', payload: null })
      eventBus.emit('frame:cancel')
    }

    return () => {
      frameDone.onClick = null
      frameCancel.onClick = null
    }
  }, [mapState.isMapReady, breakpoint, frame, frameRefs, layoutRefs, mapProvider, dispatch, eventBus, frameDone, frameCancel])
}
