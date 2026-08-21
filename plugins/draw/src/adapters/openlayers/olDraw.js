import { OLDrawManager } from './core/OLDrawManager.js'
import { MAP_SIZE_SCALES } from './defaults.js'
import { refreshAllPointSymbols } from './point/pointSymbolImages.js'

/**
 * Creates the OLDrawManager, attaches it to mapProvider, and wires app-level size/style events.
 * @returns {{ manager: OLDrawManager, remove: () => void }}
 */
export const createOLDraw = ({ mapProvider, events, eventBus, pluginConfig = {}, mapStyle = null }) => {
  const { map } = mapProvider
  const manager = new OLDrawManager(map, pluginConfig)

  if (mapStyle) {
    manager.setMapStyle(mapStyle)
  }

  mapProvider.draw = manager

  // Seed drawScale from the provider's own starting size — MAP_SET_SIZE only fires on a later runtime change, not the initial one.
  mapProvider.drawScale = MAP_SIZE_SCALES[mapProvider.mapSize] ?? 1

  // Nudges useHighlightSync to re-apply the highlight overlay — OL's own MAP_DATA_CHANGE is driven purely by basemap 'tileloadend', unrelated to the draw source.
  const notifyPointSymbolsRefreshed = () => eventBus.emit(events.MAP_DATA_CHANGE)

  const handleSetMapSize = (size) => {
    mapProvider.drawScale = MAP_SIZE_SCALES[size] ?? 1
    refreshAllPointSymbols({ manager, mapProvider }).then(notifyPointSymbolsRefreshed)
  }
  eventBus.on(events.MAP_SET_SIZE, handleSetMapSize)

  const handleSetMapStyle = (newMapStyle) => {
    manager.setMapStyle(newMapStyle)
    // Rasterised point symbol images are style-scoped (colours resolve per map style).
    refreshAllPointSymbols({ manager, mapProvider }).then(notifyPointSymbolsRefreshed)
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
