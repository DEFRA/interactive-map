// src/hooks/usePanels.js
import { useEffect, useRef } from 'react'
import { EVENTS as events } from '../../config/events.js'
import { useApp } from '../store/appContext.js'
import { useService } from '../store/serviceContext.js'

// Handlers for the public interface API events (addButton, showPanel, setApplicationMode, ...), as
// [event, handler] pairs. They read dispatch and state through refs, so they're created once and
// always act on the latest values.
const createInterfaceSubscriptions = (dispatchRef, stateRef) => {
  const handleAddButton = ({ id, config }) => {
    // Add the button
    dispatchRef.current({ type: 'ADD_BUTTON', payload: { id, config } })
    // Add all optional menu items as individual buttons (isMenuItem prevents slot rendering)
    if (Array.isArray(config.menuItems)) {
      config.menuItems.forEach(item => {
        dispatchRef.current({ type: 'ADD_BUTTON', payload: { id: item.id, config: { ...item, isMenuItem: true } } })
      })
    }
  }

  const handleToggleButtonState = ({ id, prop, value }) => {
    const { hiddenButtons: hidden, disabledButtons: disabled, pressedButtons: pressed, expandedButtons: expanded } = stateRef.current
    switch (prop) {
      case 'hidden': {
        const isHidden = typeof value === 'boolean' ? value : !hidden.has(id)
        dispatchRef.current({ type: 'TOGGLE_BUTTON_HIDDEN', payload: { id, isHidden } })
        break
      }
      case 'disabled': {
        const isDisabled = typeof value === 'boolean' ? value : !disabled.has(id)
        dispatchRef.current({ type: 'TOGGLE_BUTTON_DISABLED', payload: { id, isDisabled } })
        break
      }
      case 'pressed': {
        const isPressed = typeof value === 'boolean' ? value : !pressed.has(id)
        dispatchRef.current({ type: 'TOGGLE_BUTTON_PRESSED', payload: { id, isPressed } })
        break
      }
      case 'expanded': {
        const isExpanded = typeof value === 'boolean' ? value : !expanded.has(id)
        dispatchRef.current({ type: 'TOGGLE_BUTTON_EXPANDED', payload: { id, isExpanded } })
        break
      }
      default:
        break
    }
  }

  const handleAppOpened = () => dispatchRef.current({ type: 'TOGGLE_APP_VISIBLE', payload: true })
  const handleAppClosed = () => dispatchRef.current({ type: 'TOGGLE_APP_VISIBLE', payload: false })
  const handleAddPanel = ({ id, config }) => dispatchRef.current({ type: 'ADD_PANEL', payload: { id, config } })
  const handleRemovePanel = (id) => dispatchRef.current({ type: 'REMOVE_PANEL', payload: id })
  const handleShowPanel = ({ id, focus = true, triggeringElement }) =>
    dispatchRef.current({ type: 'OPEN_PANEL', payload: { panelId: id, focusOnOpen: focus, props: triggeringElement ? { triggeringElement } : undefined } })
  const handleHidePanel = (id) => dispatchRef.current({ type: 'CLOSE_PANEL', payload: id })
  const handleAddControl = ({ id, config }) => dispatchRef.current({ type: 'ADD_CONTROL', payload: { id, config } })
  const handleSetApplicationMode = ({ id, include, exclude }) =>
    dispatchRef.current({ type: 'SET_APPLICATION_MODE', payload: { id, include, exclude } })
  const handleClearApplicationMode = (id) => dispatchRef.current({ type: 'CLEAR_APPLICATION_MODE', payload: id })

  return [
    [events.APP_OPENED, handleAppOpened],
    [events.APP_CLOSED, handleAppClosed],
    [events.APP_ADD_BUTTON, handleAddButton],
    [events.APP_TOGGLE_BUTTON_STATE, handleToggleButtonState],
    [events.APP_ADD_PANEL, handleAddPanel],
    [events.APP_REMOVE_PANEL, handleRemovePanel],
    [events.APP_SHOW_PANEL, handleShowPanel],
    [events.APP_HIDE_PANEL, handleHidePanel],
    [events.APP_ADD_CONTROL, handleAddControl],
    [events.APP_SET_APPLICATION_MODE, handleSetApplicationMode],
    [events.APP_CLEAR_APPLICATION_MODE, handleClearApplicationMode]
  ]
}

export const useInterfaceAPI = () => {
  const { dispatch, hiddenButtons, disabledButtons, pressedButtons, expandedButtons } = useApp()
  const { eventBus } = useService()

  // Refs so event handlers always use the latest dispatch/state without re-subscribing
  const dispatchRef = useRef(dispatch)
  const stateRef = useRef({ hiddenButtons, disabledButtons, pressedButtons, expandedButtons })
  dispatchRef.current = dispatch
  stateRef.current = { hiddenButtons, disabledButtons, pressedButtons, expandedButtons }

  useEffect(() => {
    const subscriptions = createInterfaceSubscriptions(dispatchRef, stateRef)
    subscriptions.forEach(([eventName, handler]) => eventBus.on(eventName, handler))

    return () => {
      subscriptions.forEach(([eventName, handler]) => eventBus.off(eventName, handler))
    }
  }, [eventBus])
}
