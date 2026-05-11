import XYZ from 'ol/source/XYZ.js'
import TileGrid from 'ol/tilegrid/TileGrid.js'
import TileState from 'ol/TileState.js'
import { TILE_GRID_RESOLUTIONS, TILE_GRID_ORIGIN, TILE_SIZE } from './defaults.js'

const createTileLoadFunction = (transformRequest) => (tile, src) => {
  const result = transformRequest(src, 'Tile') || {}
  const url = result.url || src
  const headers = result.headers || {}
  fetch(url, { headers })
    .then(r => r.blob())
    .then(blob => { tile.getImage().src = URL.createObjectURL(blob) })
    .catch(() => tile.setState(TileState.ERROR))
}

export function createTileSource (url, transformRequest) {
  const tileGrid = new TileGrid({
    resolutions: TILE_GRID_RESOLUTIONS,
    origin: TILE_GRID_ORIGIN,
    tileSize: TILE_SIZE
  })

  const tileUrlFunction = ([z, x, y]) => url
    .replace('{z}', z)
    .replace('{x}', x)
    .replace('{y}', y)

  return new XYZ({
    projection: 'EPSG:27700',
    tileGrid,
    tileUrlFunction,
    tileLoadFunction: transformRequest ? createTileLoadFunction(transformRequest) : undefined
  })
}

export function attachAppEvents ({ tileLayer, transformRequest, events, eventBus }) {
  const handleSetMapStyle = (mapStyle) => {
    const source = createTileSource(mapStyle.url, transformRequest)
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
