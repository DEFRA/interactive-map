// src/App/store/AppProvider.jsx
import React, { createContext, useRef, useEffect, useReducer, useMemo, useCallback } from 'react'
import { initialState, reducer } from './appReducer.js'
import { handleActionSideEffects } from './appDispatchMiddleware.js'
import { ConfigContext } from './configContext.js'
import { subscribeToInterfaceChanges } from '../../utils/detectInterfaceType.js'
import { useMediaQueryDispatch } from '../hooks/useMediaQueryDispatch.js'
import { addPanel, removePanel } from '../registry/panelRegistry.js'

export const AppContext = createContext(null)

// Mirrors the reducer's panelConfig changes for added and removed panels
const getNextPanelConfig = (panelConfig, { type, payload }) => {
  if (type === 'ADD_PANEL') {
    return addPanel(panelConfig, payload.id, payload.config)
  }
  if (type === 'REMOVE_PANEL') {
    return removePanel(panelConfig, payload)
  }
  return panelConfig
}

export const AppProvider = ({ options, children }) => {
  const { pluginRegistry, buttonRegistry, panelRegistry, controlRegistry, keyboardShortcutRegistry, spatialListRegistry, eventBus, breakpointDetector } = options

  const layoutRefs = {
    appContainerRef: useRef(null),
    sideRef: useRef(null),
    mainRef: useRef(null),
    headerRef: useRef(null),
    topRef: useRef(null),
    topLeftColRef: useRef(null),
    topRightColRef: useRef(null),
    leftRef: useRef(null),
    leftTopRef: useRef(null),
    leftBottomRef: useRef(null),
    middleRef: useRef(null),
    rightRef: useRef(null),
    rightTopRef: useRef(null),
    rightBottomRef: useRef(null),
    drawerRef: useRef(null),
    bottomRef: useRef(null),
    bottomRightRef: useRef(null),
    attributionsRef: useRef(null),
    actionsRef: useRef(null),
    bannerRef: useRef(null),
    modalRef: useRef(null),
    viewportRef: useRef(null)
  }

  const buttonRefs = useRef({})

  const [state, rawDispatch] = useReducer(reducer, initialState(options))

  // Panel config including panels added or removed since the last render, so side effects for
  // e.g. addPanel() then showPanel() in the same tick see the new panel
  const panelConfigRef = useRef(state.panelConfig)
  panelConfigRef.current = state.panelConfig

  // Wrap dispatch to handle side effects
  const dispatch = useCallback((action) => {
    const panelConfig = panelConfigRef.current || options.panelRegistry.getPanelConfig()
    const previousState = state
    rawDispatch(action)
    panelConfigRef.current = getNextPanelConfig(panelConfig, action)
    handleActionSideEffects(action, previousState, panelConfig, eventBus)
  }, [state, options, eventBus])

  useMediaQueryDispatch(rawDispatch, options)

  useEffect(() => {
    const unsubBreakpoint = breakpointDetector.subscribe((breakpoint) => {
      dispatch({
        type: 'SET_BREAKPOINT',
        payload: {
          behaviour: options.behaviour,
          breakpoint,
          hybridWidth: options.hybridWidth,
          maxMobileWidth: options.maxMobileWidth
        }
      })
    })

    const unsubInterface = subscribeToInterfaceChanges((newType) => {
      dispatch({ type: 'SET_INTERFACE_TYPE', payload: newType })
    })

    return () => {
      unsubBreakpoint()
      unsubInterface()
    }
  }, [])

  const appStore = useMemo(() => ({
    ...state,
    dispatch,
    layoutRefs,
    buttonRefs,
    pluginRegistry,
    buttonRegistry,
    panelRegistry,
    controlRegistry,
    keyboardShortcutRegistry,
    spatialListRegistry
  }), [state, dispatch])

  return (
    <ConfigContext.Provider value={options}>
      <AppContext.Provider value={appStore}>
        {children}
      </AppContext.Provider>
    </ConfigContext.Provider>
  )
}
