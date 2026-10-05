import { OLDrawManager } from './core/OLDrawManager.js'
import { refreshAllPointSymbols } from './point/pointSymbolImages.js'
import { logger } from '../../../../../src/services/logger.js'

/**
 * Creates the OLDrawManager, attaches it to mapProvider, and wires app-level size/style events.
 * @returns {{ manager: OLDrawManager, remove: () => void }}
 */
export const createOLDraw = ({ mapProvider, symbolRegistry, events, eventBus, pluginConfig = {}, mapStyle = null }) => {
  const { map } = mapProvider
  const manager = new OLDrawManager(map, pluginConfig, { mapProvider, symbolRegistry })

  if (mapStyle) {
    manager.setMapStyle(mapStyle)
  }

  mapProvider.draw = manager

  // Nudges useHighlightSync to re-apply the highlight overlay — OL's own MAP_DATA_CHANGE is driven purely by basemap 'tileloadend', unrelated to the draw source.
  const notifyPointSymbolsRefreshed = () => eventBus.emit(events.MAP_DATA_CHANGE)
  const refreshPointSymbols = (pixelRatioOverride) => {
    refreshAllPointSymbols({ manager, mapProvider, pixelRatioOverride })
      .then(notifyPointSymbolsRefreshed)
      .catch((error) => logger.error('[draw] failed to refresh point symbols', error))
  }

  // Point symbols are rasterised at the map's pixelRatio, so re-resolve them when it changes (on a
  // map-size change). The event carries the new value, so this doesn't depend on whether the OL
  // provider's own MAP_SET_PIXEL_RATIO listener has applied it to the map yet.
  const handleSetPixelRatio = (pixelRatio) => {
    refreshPointSymbols(pixelRatio)
  }
  eventBus.on(events.MAP_SET_PIXEL_RATIO, handleSetPixelRatio)

  const handleSetMapStyle = (newMapStyle) => {
    manager.setMapStyle(newMapStyle)
    // Rasterised point symbol images are style-scoped (colours resolve per map style).
    refreshPointSymbols()
  }
  eventBus.on(events.MAP_SET_STYLE, handleSetMapStyle)

  return {
    manager,
    remove () {
      eventBus.off(events.MAP_SET_PIXEL_RATIO, handleSetPixelRatio)
      eventBus.off(events.MAP_SET_STYLE, handleSetMapStyle)
      manager.remove()
      mapProvider.draw = null
    }
  }
}
