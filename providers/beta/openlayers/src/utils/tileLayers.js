import XYZ from 'ol/source/XYZ.js'
import VectorTileSource from 'ol/source/VectorTile.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import MVT from 'ol/format/MVT.js'
import TileGrid from 'ol/tilegrid/TileGrid.js'
import TileState from 'ol/TileState.js'
import { stylefunction } from 'ol-mapbox-style'
import { TILE_GRID_RESOLUTIONS, TILE_GRID_ORIGIN, TILE_SIZE } from '../defaults.js'

export function fetchWithTransform (url, resourceType, transformRequest) {
  const result = transformRequest ? (transformRequest(url, resourceType) || {}) : {}
  return fetch(result.url || url, { headers: result.headers || {} })
}

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

export async function createVectorTileLayer (url, transformRequest) {
  const styleJson = await fetchWithTransform(url, 'Style', transformRequest).then(r => r.json())

  const sourceId = Object.keys(styleJson.sources)[0]
  const capabilitiesUrl = styleJson.sources[sourceId].url
  const serviceJson = await fetchWithTransform(capabilitiesUrl, 'Source', transformRequest).then(r => r.json())

  const extent = [serviceJson.fullExtent.xmin, serviceJson.fullExtent.ymin, serviceJson.fullExtent.xmax, serviceJson.fullExtent.ymax]
  const origin = [serviceJson.tileInfo.origin.x, serviceJson.tileInfo.origin.y]
  const resolutions = serviceJson.tileInfo.lods.map(l => l.resolution).slice(0, 16)
  const tileSize = serviceJson.tileInfo.rows
  const tileUrl = serviceJson.tiles[0]

  // Insert extension before any query string to match Mapbox GL sprite convention
  const spriteBase = styleJson.sprite
  const queryIdx = spriteBase.indexOf('?')
  const [spritePath, spriteQuery] = queryIdx >= 0 ? [spriteBase.slice(0, queryIdx), spriteBase.slice(queryIdx)] : [spriteBase, '']
  const spritesJsonUrl = `${spritePath}.json${spriteQuery}`
  const spritesPngUrl = `${spritePath}.png${spriteQuery}`

  const spritesJson = await fetchWithTransform(spritesJsonUrl, 'SpriteJSON', transformRequest).then(r => r.json())

  // OS style JSON uses zero opacity for icon colours — fix before applying the style
  styleJson.layers.forEach(styleLayer => {
    if (styleLayer.paint?.['icon-color']) {
      styleLayer.paint['icon-color'] = styleLayer.paint['icon-color'].replace(',0)', ',1)')
    }
  })

  const tileGrid = new TileGrid({ extent, origin, resolutions, tileSize })

  // Tile URL from capabilities already includes the API key — no custom tileLoadFunction needed
  const source = new VectorTileSource({
    format: new MVT(),
    url: tileUrl,
    projection: 'EPSG:27700',
    tileGrid
  })
  const layer = new VectorTileLayer({ source, declutter: true, renderMode: 'vector' })

  stylefunction(layer, styleJson, sourceId, resolutions, spritesJson, spritesPngUrl)

  return { layer, source }
}
