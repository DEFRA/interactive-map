import XYZ from 'ol/source/XYZ.js'
import VectorTileSource from 'ol/source/VectorTile.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import OGCVectorTile from 'ol/source/OGCVectorTile.js'
import MVT from 'ol/format/MVT.js'
import TileGrid from 'ol/tilegrid/TileGrid.js'
import TileState from 'ol/TileState.js'
import { stylefunction, recordStyleLayer } from 'ol-mapbox-style'
import { TILE_GRID_RESOLUTIONS, TILE_GRID_ORIGIN, TILE_SIZE } from '../defaults.js'

// Enable style-layer name recording so feature.get('mapbox-layer').id returns the
// style layer name — required for snap layer filtering by style layer name.
recordStyleLayer(true)

const CRS = 'EPSG:27700'

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
    projection: CRS,
    tileGrid,
    tileUrlFunction,
    tileLoadFunction: transformRequest ? createTileLoadFunction(transformRequest) : undefined
  })
}

export async function createMapStyleLayer (mapStyle, transformRequest) {
  if (mapStyle.type === 'raster') {
    const source = createTileSource(mapStyle.url, transformRequest)
    return { layer: new TileLayer({ source }), source }
  }

  if (mapStyle.type === 'ogc-vt') {
    return createOGCVectorTileLayer(mapStyle.url, transformRequest, mapStyle)
  }

  return createVectorTileLayer(mapStyle.url, transformRequest, mapStyle)
}

// Insert extension before any query string to match Mapbox GL sprite convention
function resolveSprite (spriteBase, transformRequest) {
  const queryIdx = spriteBase.indexOf('?')
  const [spritePath, spriteQuery] = queryIdx >= 0 ? [spriteBase.slice(0, queryIdx), spriteBase.slice(queryIdx)] : [spriteBase, '']
  const jsonUrl = `${spritePath}.json${spriteQuery}`
  const pngUrl = `${spritePath}.png${spriteQuery}`
  return { jsonUrl, pngUrl, fetch: () => fetchWithTransform(jsonUrl, 'SpriteJSON', transformRequest).then(r => r.json()) }
}

// The OS VTS styles are designed to work with the limited ArcGIS/ESRI SDK, which does not support
// icon-color for sprite tinting. OS works around this by setting icon-color alpha to 0 (a no-op
// in the ESRI renderer) so the sprite renders as-is. ol-mapbox-style interprets the colour
// literally though, making icons invisible. Fix by setting alpha to 1 (opaque tint).
function fixIconOpacity (styleJson) {
  styleJson.layers.forEach(styleLayer => {
    if (styleLayer.paint?.['icon-color']) {
      styleLayer.paint['icon-color'] = styleLayer.paint['icon-color'].replace(',0)', ',1)')
    }
  })
}

export async function createVectorTileLayer (url, transformRequest, { renderMode } = {}) {
  const styleJson = await fetchWithTransform(url, 'Style', transformRequest).then(r => r.json())

  const sourceId = Object.keys(styleJson.sources)[0]
  const capabilitiesUrl = styleJson.sources[sourceId].url
  const serviceJson = await fetchWithTransform(capabilitiesUrl, 'Source', transformRequest).then(r => r.json())

  const extent = [serviceJson.fullExtent.xmin, serviceJson.fullExtent.ymin, serviceJson.fullExtent.xmax, serviceJson.fullExtent.ymax]
  const origin = [serviceJson.tileInfo.origin.x, serviceJson.tileInfo.origin.y]
  const resolutions = serviceJson.tileInfo.lods.map(l => l.resolution).slice(0, 16)
  const tileSize = serviceJson.tileInfo.rows
  const tileUrl = serviceJson.tiles[0]

  const sprite = resolveSprite(styleJson.sprite, transformRequest)
  const spritesJson = await sprite.fetch()

  fixIconOpacity(styleJson)

  const tileGrid = new TileGrid({ extent, origin, resolutions, tileSize })

  // Tile URL from capabilities already includes the API key — no custom tileLoadFunction needed
  const source = new VectorTileSource({
    format: new MVT(),
    url: tileUrl,
    projection: CRS,
    tileGrid
  })
  const layer = new VectorTileLayer({ source, declutter: true, ...(renderMode && { renderMode }) })

  stylefunction(layer, styleJson, sourceId, resolutions, spritesJson, sprite.pngUrl)

  return { layer, source }
}

export async function createOGCVectorTileLayer (url, transformRequest, { renderMode } = {}) {
  const styleJson = await fetchWithTransform(url, 'Style', transformRequest).then(r => r.json())

  const sourceId = Object.keys(styleJson.sources)[0]
  const tilesUrl = styleJson.sources[sourceId].url

  // Fetch tileset descriptor to get the tile matrix set URL (includes API key), in parallel with sprites
  const sprite = resolveSprite(styleJson.sprite, transformRequest)
  const tilesetJson = await fetchWithTransform(tilesUrl, 'Source', transformRequest).then(r => r.json())
  const tmsLink = tilesetJson.links?.find(l => l.rel === 'http://www.opengis.net/def/rel/ogc/1.0/tiling-scheme')
  const [tmsJson, spritesJson] = await Promise.all([
    fetchWithTransform(tmsLink.href, 'Source', transformRequest).then(r => r.json()),
    sprite.fetch()
  ])

  const resolutions = tmsJson.tileMatrices.map(m => m.cellSize)
  const origin = tmsJson.tileMatrices[0].pointOfOrigin
  const tileSize = [tmsJson.tileMatrices[0].tileHeight, tmsJson.tileMatrices[0].tileWidth]

  // OS NGD returns tiles as 'application/octet-stream' rather than the standard MVT media type
  const format = new MVT()
  format.supportedMediaTypes.push('application/octet-stream')

  const tileGrid = new TileGrid({ resolutions, origin, tileSize })
  const source = new OGCVectorTile({ url: tilesUrl, format, tileGrid, projection: CRS })
  const layer = new VectorTileLayer({ source, declutter: true, ...(renderMode && { renderMode }) })

  stylefunction(layer, styleJson, sourceId, resolutions, spritesJson, sprite.pngUrl)

  return { layer, source }
}
