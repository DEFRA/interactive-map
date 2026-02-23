// src/App/store/mapReducer.js
import { actionsMap } from './mapActionsMap.js'

export const initialState = (config) => {
  const {
    center,
    zoom,
    bounds,
    extent,
    mapStyle,
    mapSize,
    markers
  } = config

  const { registeredPlugins } = config.pluginRegistry

  // Does a plugin handle map styles
  const pluginHandlesMapStyles = !!registeredPlugins?.find(plugin => plugin.config?.handlesMapStyle)

  return {
    isMapReady: false,
    mapProvider: null,
    mapStyle: pluginHandlesMapStyles ? null : mapStyle,
    mapSize,
    center,
    zoom,
    bounds: bounds || extent,
    resolution: null,
    isAtMaxZoom: null,
    isAtMinZoom: null,

    // Full target marker state
    crossHair: {
      isVisible: false,
      isPinnedToMap: false,
      state: 'active'
    },

    // Markers
    markers: {
      items: markers || []
    }
  }
}

export const reducer = (state, action) => {
  const { type, payload } = action
  const fn = actionsMap[type]
  if (fn) {
    return fn(state, payload)
  }
  return state
}
