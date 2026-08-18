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

  // Unlike the MapLibre adapter, OL's pixel ratio (point/pointSymbolImages.js's
  // getPixelRatio()) is computed directly from mapProvider.drawScale — there's no separate
  // "carries the fresh value" event to wait for the way ML's MAP_SET_PIXEL_RATIO is needed
  // for; drawScale is already updated by the time refreshAllPointSymbols runs below.
  const handleSetMapSize = (size) => {
    mapProvider.drawScale = MAP_SIZE_SCALES[size] ?? 1
    refreshAllPointSymbols({ manager, mapProvider })
  }
  eventBus.on(events.MAP_SET_SIZE, handleSetMapSize)

  const handleSetMapStyle = (newMapStyle) => {
    manager.setMapStyle(newMapStyle)
    // Rasterised point symbol images are style-scoped (colours resolve per map style) —
    // re-resolve every drawn point's icon now the new style has been applied.
    refreshAllPointSymbols({ manager, mapProvider })
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
