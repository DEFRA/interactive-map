import { OLDrawManager } from './core/OLDrawManager.js'
import { MAP_SIZE_SCALES } from './defaults.js'
import { refreshAllPointSymbols } from './point/pointSymbolImages.js'

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

  // Nudges useHighlightSync to re-apply the highlight overlay — OL's own MAP_DATA_CHANGE is
  // driven purely by basemap 'tileloadend', unrelated to the draw source, so a resize/style
  // change would otherwise never trigger a refresh at all.
  const notifyPointSymbolsRefreshed = () => eventBus.emit(events.MAP_DATA_CHANGE)

  // mapProvider.drawScale is already updated by the time refreshAllPointSymbols runs below,
  // unlike MapLibre which needs to wait for a separate MAP_SET_PIXEL_RATIO event.
  const handleSetMapSize = (size) => {
    mapProvider.drawScale = MAP_SIZE_SCALES[size] ?? 1
    refreshAllPointSymbols({ manager, mapProvider }).then(notifyPointSymbolsRefreshed)
  }
  eventBus.on(events.MAP_SET_SIZE, handleSetMapSize)

  const handleSetMapStyle = (newMapStyle) => {
    manager.setMapStyle(newMapStyle)
    // Rasterised point symbol images are style-scoped (colours resolve per map style) —
    // re-resolve every drawn point's icon now the new style has been applied.
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
