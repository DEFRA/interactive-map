import { setDatasetRegistry } from '../registry/getDatasetRegistry.js'
import { buildMenuState } from '../reducers/menuStateReducer.js'

export const createMenu = ({ menu, eventBus, dispatch, pluginStateRef }) => {
  const menuState = buildMenuState(menu)
  dispatch({ type: 'SET_MENU', payload: { menu, menuState } })
  // Request a handle on the datasetsRegistry singleton, so that the menu plugin can access it when needed
  eventBus.requestOnce('datasets:registry', setDatasetRegistry)
  // add a listener for the menu:state event, which will be emitted whenever requested by other plugins,
  // e.g. the datasets plugin, so they can access the menu state.
  return eventBus.emitWhenRequested('menu:state', pluginStateRef)
}
