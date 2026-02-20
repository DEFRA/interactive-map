// src/App/store/MapProvider.jsx
import React, { createContext, useEffect, useReducer, useMemo } from 'react'
import { initialState, reducer } from './mapReducer.js'
import { EVENTS as events } from '../../config/events.js'

export const MapContext = createContext(null)

export const MapProvider = ({ options, children }) => {
  const [state, dispatch] = useReducer(reducer, initialState(options))

  const handleMapReady = (mapProvider) => {
    dispatch({ type: 'SET_MAP_READY', payload: mapProvider })
  }

  const handleInitMapStyles = (mapStyles) => {
    const savedMapStyleId = localStorage.getItem(`${options.id}:mapStyleId`)
    const mapStyle = mapStyles.find(s => s.id === savedMapStyleId) || mapStyles[0]
    const savedMapSize = localStorage.getItem(`${options.id}:mapSize`)
    const mapSize = savedMapSize || options.mapSize
    dispatch({ type: 'SET_MAP_STYLE', payload: mapStyle })
    dispatch({ type: 'SET_MAP_SIZE', payload: mapSize })
  }

  const handleSetMapStyle = (mapStyle) => {
    dispatch({ type: 'SET_MAP_STYLE', payload: mapStyle })
  }

  const handleSetMapSize = (mapSize) => {
    dispatch({ type: 'SET_MAP_SIZE', payload: mapSize })
  }

  // Listen to eventBus and update state
  const { eventBus } = options

  useEffect(() => {
    eventBus.on(events.MAP_READY, handleMapReady)
    eventBus.on(events.MAP_INIT_MAP_STYLES, handleInitMapStyles)
    eventBus.on(events.MAP_SET_STYLE, handleSetMapStyle)
    eventBus.on(events.MAP_SET_SIZE, handleSetMapSize)

    return () => {
      eventBus.off(events.MAP_READY, handleMapReady)
      eventBus.off(events.MAP_INIT_MAP_STYLES, handleInitMapStyles)
      eventBus.off(events.MAP_SET_STYLE, handleSetMapStyle)
      eventBus.off(events.MAP_SET_SIZE, handleSetMapSize)
    }
  }, [])

  // Persist mapStyle and mapSize in localStorage
  useEffect(() => {
    if (!state.mapStyle || !state.mapSize) {
      return
    }
    localStorage.setItem(`${options.id}:mapStyleId`, state.mapStyle.id)
    localStorage.setItem(`${options.id}:mapSize`, state.mapSize)
  }, [state.mapStyle, state.mapSize])

  const mapStore = useMemo(() => ({
    ...state,
    dispatch
  }), [state])

  return (
    <MapContext.Provider value={mapStore}>
      {children}
    </MapContext.Provider>
  )
}
