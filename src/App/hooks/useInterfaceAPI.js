// src/hooks/usePanels.js
import { useEffect } from 'react'
import { EVENTS as events } from '../../config/events.js'
import { useApp } from '../store/appContext.js'
import { useService } from '../store/serviceContext.js'

export const useInterfaceAPI = () => {
  const { dispatch } = useApp()
  const { eventBus } = useService()

  useEffect(() => {
    const handleAddButton = ({ id, config }) => {
      dispatch({ type: 'ADD_BUTTON', payload: { id, config } })
    }

    const handleAddPanel = ({ id, config }) => {
      dispatch({ type: 'ADD_PANEL', payload: { id, config } })
    }

    const handleRemovePanel = (id) => {
      dispatch({ type: 'REMOVE_PANEL', payload: id })
    }

    const handleShowPanel = (id) => {
      dispatch({ type: 'OPEN_PANEL', payload: { panelId: id } })
    }

    const handleHidePanel = (id) => {
      dispatch({ type: 'CLOSE_PANEL', payload: id })
    }

    const handleAddControl = ({ id, config }) => {
      dispatch({ type: 'ADD_CONTROL', payload: { id, config } })
    }

    eventBus.on(events.APP_ADD_BUTTON, handleAddButton)
    eventBus.on(events.APP_ADD_PANEL, handleAddPanel)
    eventBus.on(events.APP_REMOVE_PANEL, handleRemovePanel)
    eventBus.on(events.APP_SHOW_PANEL, handleShowPanel)
    eventBus.on(events.APP_HIDE_PANEL, handleHidePanel)
    eventBus.on(events.APP_ADD_CONTROL, handleAddControl)

    return () => {
      eventBus.off(events.APP_ADD_BUTTON, handleAddButton)
      eventBus.off(events.APP_ADD_PANEL, handleAddPanel)
      eventBus.off(events.APP_REMOVE_PANEL, handleRemovePanel)
      eventBus.off(events.APP_SHOW_PANEL, handleShowPanel)
      eventBus.off(events.APP_HIDE_PANEL, handleHidePanel)
      eventBus.off(events.APP_ADD_CONTROL, handleAddControl)
    }
  }, [dispatch, eventBus])
}
