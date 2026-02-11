// src/App/store/PluginProvider.jsx
import React, { createContext, useReducer, useContext, useMemo, useRef } from 'react'
import { useConfig } from '../store/configContext.js'

export const PluginContext = createContext(null)

export function makeReducer (actionsMap) {
  return (state = {}, action) => {
    const reducerFn = actionsMap?.[action?.type]
    return reducerFn ? reducerFn(state, action.payload) : state
  }
}

export const PluginProvider = ({ children }) => {
  const { pluginRegistry } = useConfig()
  const pluginReducers = {}
  const initialState = {}
  const refs = useRef({}) // Persistent ref registry

  // Build plugin definitions and initial state
  pluginRegistry.registeredPlugins.forEach(plugin => {
    const reducerDef = plugin.reducer
    if (reducerDef) {
      const { initialState: init, actions } = reducerDef
      pluginReducers[plugin.id] = makeReducer(actions)
      initialState[plugin.id] = init
    }

    // Initialize ref registry for each plugin
    if (!refs.current[plugin.id]) {
      refs.current[plugin.id] = {}
    }
  })

  // Combined reducer
  const combinedReducer = (pluginState, action) => {
    const { pluginId } = action
    if (pluginId && pluginReducers[pluginId]) {
      return {
        ...pluginState,
        [pluginId]: pluginReducers[pluginId](pluginState[pluginId], action)
      }
    }
    return pluginState
  }

  const [state, dispatch] = useReducer(combinedReducer, initialState)

  // Stable ref getter
  const getPluginRef = (pluginId, key) => {
    if (!refs.current[pluginId]) {
      refs.current[pluginId] = {}
    }
    if (!refs.current[pluginId][key]) {
      refs.current[pluginId][key] = React.createRef()
    }
    return refs.current[pluginId][key]
  }

  const contextValue = useMemo(() => ({
    state,
    dispatch,
    refs, // persist refs identity here
    getPluginRef
  }), [state, dispatch]) // refs excluded to keep identity stable

  return (
    <PluginContext.Provider value={contextValue}>
      {children}
    </PluginContext.Provider>
  )
}

// Hook
export const usePlugin = (pluginId) => {
  const context = useContext(PluginContext)
  if (!context) {
    throw new Error('usePlugin must be used within PluginProvider')
  }

  const { state, dispatch, refs, getPluginRef } = context

  // Create plugin-specific refs container
  if (!refs.current[pluginId]) {
    refs.current[pluginId] = {}
  }

  return {
    ...state[pluginId],
    dispatch: (action) => dispatch({ ...action, pluginId }),
    refs: refs.current[pluginId], // stable identity object
    useRef: (key) => getPluginRef(pluginId, key)
  }
}
