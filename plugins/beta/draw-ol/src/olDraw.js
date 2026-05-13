import { OLDrawManager } from './core/OLDrawManager.js'

/**
 * Creates the OLDrawManager, attaches it to mapProvider, and wires
 * any app-level events (e.g. MAP_SET_SIZE for scale-aware touch targets).
 *
 * @returns {{ remove: () => void }}
 */
export const createOLDraw = ({ mapProvider, events, eventBus }) => {
  const { map } = mapProvider
  const manager = new OLDrawManager(map)

  mapProvider.draw = manager

  const handleSetMapSize = (size) => {
    // Scale factor informs touch target pixel offsets
    mapProvider.drawScale = { small: 1, medium: 1.5, large: 2 }[size] ?? 1
  }
  eventBus.on(events.MAP_SET_SIZE, handleSetMapSize)

  return {
    remove () {
      eventBus.off(events.MAP_SET_SIZE, handleSetMapSize)
      manager.remove()
      mapProvider.draw = null
    }
  }
}
