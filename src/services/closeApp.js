// src/services/closeApp.js
import { EVENTS as events } from '../config/events.js'

export function closeApp (mapId, handleExitClick, eventBus) {
  eventBus.emit(events.MAP_EXIT, { mapId })

  if (history.state?.isBack) {
    history.back()
    return
  }

  handleExitClick()
}
