import { setDatasetRegistry } from '../registry/getDatasetRegistry.js'
import globalEventBus from '../../../../src/services/eventBus.js'

export const createMapKey = () => {
  console.log('createMapKey')

  // The map-key plugin, requires access to the datasets registry, so it can render the
  // datasets key items.
  // However, the order the plugins are added can affect whether the event is emitted
  // before or after the map-key plugin is loaded. So, if the datasets plugin is loaded
  // first, it will emit the datasets:registryReady event, and the map-key plugin will
  // receive it. Otherwise, the map-key plugin will emit the
  // datasets:requestRegistry event, and the datasets plugin will respond.
  globalEventBus.on('datasets:registryReady', setDatasetRegistry)
  globalEventBus.emit('datasets:requestRegistry')
  return {
    remove: () => {
      globalEventBus.off('datasets:registryReady', setDatasetRegistry)
    }
  }
}
