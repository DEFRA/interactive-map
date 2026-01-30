import { errorMessages } from './defaults.js'

export function attachEvents({ appState, pluginState, mapProvider, useLocationButton }) {
  const { dispatch: appDispatch, buttonRefs } = appState
  const { dispatch: pluginDispatch } = pluginState

  // ---- Friendly error translation --------------------------------
  const getFriendlyError = (err) => {
    if (!err || typeof err.code !== 'number') {
      return errorMessages.FALLBACK
    }

    return errorMessages[err.code] || errorMessages.FALLBACK
  }

  // ---- One-time "Use My Location" handler -------------------------
  useLocationButton.onClick = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords

      try {
        mapProvider.setView({
          center: [longitude, latitude],
          zoom: 12
        })
      } catch (e) {
        console.log('Map provider failed to pan:', e)
      }
    }, (err) => {
      const message = getFriendlyError(err)
      const triggeringElement = buttonRefs.current[useLocationButton.id]
      pluginDispatch({ type: 'SET_ERROR_MESSAGE', payload: message })
      appDispatch({ type: 'OPEN_PANEL', payload: { panelId: 'useLocation', props: { triggeringElement }}})
    }, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    })
  }

  // ---- OPTIONAL: Live tracking (ready but disabled) ----------------
  // Call this manually if you want tracking mode later.
  let watchId = null

  const startTracking = () => {
    if (!navigator.geolocation) {
      console.log('Geolocation is not supported.')
      return
    }

    watchId = navigator.geolocation.watchPosition((pos) => {
      const { latitude, longitude } = pos.coords
      console.log('Tracking update:', latitude, longitude)

      try {
        mapProvider.panTo({
          lat: latitude,
          lng: longitude,
          animate: false // smoother for continuous updates
        })
      } catch (e) {
        console.log('Map provider failed to pan:', e)
      }
    }, (err) => {
      console.log('Tracking error:', getFriendlyError(err))
    }, {
      enableHighAccuracy: true
    })
  }

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
      console.log('Tracking stopped.')
    }
  }

  // Return helpers in case you want them in future
  return { startTracking, stopTracking }
}