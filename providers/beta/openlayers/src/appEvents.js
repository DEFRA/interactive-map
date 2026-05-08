import XYZ from 'ol/source/XYZ.js'
import TileGrid from 'ol/tilegrid/TileGrid.js'
import { TILE_GRID_RESOLUTIONS, TILE_GRID_ORIGIN, TILE_SIZE } from './defaults.js'

function createTileSource (url, apiKey) {
  return new XYZ({
    projection: 'EPSG:27700',
    url: `${url}?key=${apiKey}`,
    tileGrid: new TileGrid({
      resolutions: TILE_GRID_RESOLUTIONS,
      origin: TILE_GRID_ORIGIN,
      tileSize: TILE_SIZE
    })
  })
}

export function attachAppEvents ({
  tileLayer,
  apiKey,
  events,
  eventBus
}) {
  const handleSetMapStyle = (mapStyle) => {
    const source = createTileSource(mapStyle.url, apiKey)
    tileLayer.setSource(source)
    eventBus.emit(events.MAP_STYLE_CHANGE, { mapStyleId: mapStyle.id })
  }

  eventBus.on(events.MAP_SET_STYLE, handleSetMapStyle)

  return {
    remove () {
      eventBus.off(events.MAP_SET_STYLE, handleSetMapStyle)
    }
  }
}
