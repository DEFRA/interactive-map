import { OLDrawManager } from './core/OLDrawManager.js'
import { MAP_SIZE_SCALES } from './defaults.js'

/**
 * Creates the OLDrawManager, attaches it to mapProvider, and wires
 * app-level events (MAP_SET_SIZE for scale-aware touch targets,
 * MAP_SET_STYLE for dynamic color updates).
 *
 * @returns {{ manager: OLDrawManager, remove: () => void }}
 */
export const createOLDraw = ({ mapProvider, events, eventBus, pluginConfig = {}, mapStyle = null }) => {
  const { map } = mapProvider
  const manager = new OLDrawManager(map, pluginConfig)

  if (mapStyle) {
    manager.setMapStyle(mapStyle)
  }

  mapProvider.draw = manager

  const handleSetMapSize = (size) => {
    mapProvider.drawScale = MAP_SIZE_SCALES[size] ?? 1
  }
  eventBus.on(events.MAP_SET_SIZE, handleSetMapSize)

  const handleSetMapStyle = (newMapStyle) => {
    manager.setMapStyle(newMapStyle)
  }
  eventBus.on(events.MAP_SET_STYLE, handleSetMapStyle)

  return {
    manager,
    remove () {
      eventBus.off(events.MAP_SET_SIZE, handleSetMapSize)
      eventBus.off(events.MAP_SET_STYLE, handleSetMapStyle)
      manager.remove()
      mapProvider.draw = null
    }
  }
}
