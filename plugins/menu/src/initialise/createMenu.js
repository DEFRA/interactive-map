import { setDatasetRegistry } from '../registry/getDatasetRegistry.js'

export const createMenu = ({ menu, eventBus, dispatch }) => {
  dispatch({ type: 'SET_MENU', payload: { menu } })
  // The menu plugin, requires access to the datasets registry, so it can render the
  // datasets key items.
  // However, the order the plugins are added can affect whether the event is emitted
  // before or after the menu plugin is loaded. So, if the datasets plugin is loaded
  // first, it will emit the datasets:registryReady event, and the menu plugin will
  // receive it. Otherwise, the menu plugin will emit the
  // datasets:requestRegistry event, and the datasets plugin will respond.
  eventBus.on('datasets:registryReady', setDatasetRegistry)
  eventBus.emit('datasets:requestRegistry')
  return {
    remove: () => {
      eventBus.off('datasets:registryReady', setDatasetRegistry)
    }
  }
}
