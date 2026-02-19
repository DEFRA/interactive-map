// src/App/store/AppProvider.jsx
import React, { createContext, useRef, useEffect, useReducer, useMemo, useCallback } from 'react'
import { initialState, reducer } from './appReducer.js'
import { handleActionSideEffects } from './appDispatchMiddleware.js'
import { EVENTS as events } from '../../config/events.js'
import { ConfigContext } from './configContext.js'
import { subscribeToInterfaceChanges } from '../../utils/detectInterfaceType.js'
import { useMediaQueryDispatch } from '../hooks/useMediaQueryDispatch.js'

export const AppContext = createContext(null)

export const AppProvider = ({ options, children }) => {
  const { pluginRegistry, buttonRegistry, panelRegistry, controlRegistry, eventBus, breakpointDetector } = options

  const layoutRefs = {
    appContainerRef: useRef(null),
    sideRef: useRef(null),
    mainRef: useRef(null),
    topRef: useRef(null),
    topLeftColRef: useRef(null),
    topRightColRef: useRef(null),
    insetRef: useRef(null),
    rightRef: useRef(null),
    middleRef: useRef(null),
    bottomRef: useRef(null),
    footerRef: useRef(null),
    actionsRef: useRef(null),
    bannerRef: useRef(null),
    modalRef: useRef(null),
    viewportRef: useRef(null)
  }

  const buttonRefs = useRef({})

  const [state, rawDispatch] = useReducer(reducer, initialState(options))

  // Wrap dispatch to handle side effects
  const dispatch = useCallback((action) => {
    const panelConfig = state.panelConfig || options.panelRegistry.getPanelConfig()
    const previousState = state
    rawDispatch(action)
    handleActionSideEffects(action, previousState, panelConfig, eventBus)
  }, [state, options, eventBus])

  useMediaQueryDispatch(rawDispatch, options)

  const handleSetMode = (mode) => {
    dispatch({ type: 'SET_MODE', payload: mode })
  }

  const handleRevertMode = () => {
    dispatch({ type: 'REVERT_MODE' })
  }

  useEffect(() => {
    eventBus.on(events.APP_SET_MODE, handleSetMode)
    eventBus.on(events.APP_REVERT_MODE, handleRevertMode)

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
      eventBus.off(events.APP_SET_MODE, handleSetMode)
      eventBus.off(events.APP_REVERT_MODE, handleRevertMode)
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
    controlRegistry
  }), [state, dispatch])

  return (
    <ConfigContext.Provider value={options}>
      <AppContext.Provider value={appStore}>
        {children}
      </AppContext.Provider>
    </ConfigContext.Provider>
  )
}
