import XYZ from 'ol/source/XYZ.js'
import TileGrid from 'ol/tilegrid/TileGrid.js'
import VectorTileSource from 'ol/source/VectorTile.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import { stylefunction } from 'ol-mapbox-style'
import { createTileSource, createVectorTileLayer } from './tileLayers.js'
import { TILE_GRID_RESOLUTIONS, TILE_GRID_ORIGIN, TILE_SIZE } from '../defaults.js'

const mockTileGridInstance = {}
const mockSourceInstance = {}
const mockVectorTileSourceInstance = {}
const mockVectorTileLayerInstance = {}
const mockMVTInstance = {}

jest.mock('ol/source/XYZ.js', () => ({ __esModule: true, default: jest.fn(() => mockSourceInstance) }))
jest.mock('ol/tilegrid/TileGrid.js', () => ({ __esModule: true, default: jest.fn(() => mockTileGridInstance) }))
jest.mock('ol/TileState.js', () => ({ __esModule: true, default: { ERROR: 'error' } }))
jest.mock('ol/source/VectorTile.js', () => ({ __esModule: true, default: jest.fn(() => mockVectorTileSourceInstance) }))
jest.mock('ol/layer/VectorTile.js', () => ({ __esModule: true, default: jest.fn(() => mockVectorTileLayerInstance) }))
jest.mock('ol/format/MVT.js', () => ({ __esModule: true, default: jest.fn(() => mockMVTInstance) }))
jest.mock('ol-mapbox-style', () => ({ __esModule: true, stylefunction: jest.fn() }))

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

const mockStyleJson = {
  sources: { esri: { url: 'https://example.com/caps.json' } },
  sprite: 'https://example.com/sprites/sprite',
  layers: []
}

const mockServiceJson = {
  fullExtent: { xmin: -238375, ymin: 0, xmax: 700000, ymax: 1300000 },
  tileInfo: {
    origin: { x: -238375, y: 1376256 },
    lods: Array.from({ length: 20 }, (_, i) => ({ resolution: 896 / Math.pow(2, i) })),
    rows: 256,
    spatialReference: { latestWkid: 27700 }
  },
  tiles: ['https://example.com/tiles/{z}/{x}/{y}.pbf']
}

const mockSpritesJson = { myIcon: { x: 0, y: 0, width: 16, height: 16, pixelRatio: 1 } }

function makeVectorFetchMock (styleJson = mockStyleJson) {
  return jest.fn().mockImplementation(url => {
    if (url === styleJson.sources[Object.keys(styleJson.sources)[0]].url) {
      return Promise.resolve({ json: () => Promise.resolve(mockServiceJson) })
    }
    if (url.endsWith('.json') || url.includes('.json?')) {
      return Promise.resolve({ json: () => Promise.resolve(mockSpritesJson) })
    }
    return Promise.resolve({ json: () => Promise.resolve(styleJson) })
  })
}

describe('createTileSource', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates TileGrid with correct OS tile grid config', () => {
    createTileSource('https://tiles.example.com/{z}/{x}/{y}', null)
    expect(TileGrid).toHaveBeenCalledWith({
      resolutions: TILE_GRID_RESOLUTIONS,
      origin: TILE_GRID_ORIGIN,
      tileSize: TILE_SIZE
    })
  })

  it('creates XYZ source with EPSG:27700 projection', () => {
    createTileSource('https://tiles.example.com/{z}/{x}/{y}', null)
    expect(XYZ).toHaveBeenCalledWith(expect.objectContaining({ projection: 'EPSG:27700' }))
  })

  it('tileUrlFunction substitutes z, x, y into url template', () => {
    createTileSource('https://tiles.example.com/{z}/{x}/{y}', null)
    const { tileUrlFunction } = XYZ.mock.calls[0][0]
    expect(tileUrlFunction([7, 3, 5])).toBe('https://tiles.example.com/7/3/5')
  })

  it('does not set tileLoadFunction when transformRequest is null', () => {
    createTileSource('https://tiles.example.com/{z}/{x}/{y}', null)
    const { tileLoadFunction } = XYZ.mock.calls[0][0]
    expect(tileLoadFunction).toBeUndefined()
  })

  it('sets tileLoadFunction when transformRequest is provided', () => {
    createTileSource('https://tiles.example.com/{z}/{x}/{y}', jest.fn())
    const { tileLoadFunction } = XYZ.mock.calls[0][0]
    expect(typeof tileLoadFunction).toBe('function')
  })
})

describe('tileLoadFunction (via transformRequest)', () => {
  const url = 'https://tiles.example.com/7/3/5'
  const mockImg = { src: null }
  const mockTile = { getImage: () => mockImg, setState: jest.fn() }

  beforeEach(() => {
    jest.clearAllMocks()
    mockImg.src = null
    global.URL.createObjectURL = jest.fn(() => 'blob:test')
    global.fetch = jest.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob())
    })
  })

  function getTileLoadFn (transformRequest) {
    createTileSource('https://tiles.example.com/{z}/{x}/{y}', transformRequest)
    return XYZ.mock.calls[0][0].tileLoadFunction
  }

  it('calls transformRequest with src and "Tile" resource type', async () => {
    const transformRequest = jest.fn(() => null)
    const fn = getTileLoadFn(transformRequest)
    fn(mockTile, url)
    expect(transformRequest).toHaveBeenCalledWith(url, 'Tile')
  })

  it('uses url and headers from transformRequest result', async () => {
    const transformRequest = jest.fn(() => ({ url: 'https://proxied.example.com/tile', headers: { Authorization: 'Bearer abc' } }))
    const fn = getTileLoadFn(transformRequest)
    fn(mockTile, url)
    await flushPromises()
    expect(fetch).toHaveBeenCalledWith('https://proxied.example.com/tile', { headers: { Authorization: 'Bearer abc' } })
  })

  it('falls back to original src and empty headers when transformRequest returns null', async () => {
    const fn = getTileLoadFn(() => null)
    fn(mockTile, url)
    await flushPromises()
    expect(fetch).toHaveBeenCalledWith(url, { headers: {} })
  })

  it('sets tile image src via createObjectURL on success', async () => {
    const fn = getTileLoadFn(() => null)
    fn(mockTile, url)
    await flushPromises()
    expect(mockImg.src).toBe('blob:test')
  })

  it('sets tile state to ERROR on fetch failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'))
    const fn = getTileLoadFn(() => null)
    fn(mockTile, url)
    await flushPromises()
    expect(mockTile.setState).toHaveBeenCalledWith('error')
  })
})

describe('createVectorTileLayer', () => {
  const styleUrl = 'https://example.com/styles'

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = makeVectorFetchMock()
  })

  it('fetches style JSON from url', async () => {
    await createVectorTileLayer(styleUrl, null)
    expect(fetch).toHaveBeenCalledWith(styleUrl, { headers: {} })
  })

  it('fetches capabilities from first source url in style JSON', async () => {
    await createVectorTileLayer(styleUrl, null)
    expect(fetch).toHaveBeenCalledWith('https://example.com/caps.json', { headers: {} })
  })

  it('fetches sprite JSON from sprite base + .json', async () => {
    await createVectorTileLayer(styleUrl, null)
    expect(fetch).toHaveBeenCalledWith('https://example.com/sprites/sprite.json', { headers: {} })
  })

  it('creates TileGrid from capabilities tileInfo', async () => {
    await createVectorTileLayer(styleUrl, null)
    expect(TileGrid).toHaveBeenCalledWith({
      extent: [-238375, 0, 700000, 1300000],
      origin: [-238375, 1376256],
      resolutions: expect.any(Array),
      tileSize: 256
    })
  })

  it('slices capabilities lods to max 16 resolutions', async () => {
    await createVectorTileLayer(styleUrl, null)
    const { resolutions } = TileGrid.mock.calls[0][0]
    expect(resolutions.length).toBe(16)
  })

  it('creates VectorTileSource with MVT format and 27700 projection', async () => {
    await createVectorTileLayer(styleUrl, null)
    expect(VectorTileSource).toHaveBeenCalledWith(expect.objectContaining({
      format: mockMVTInstance,
      url: 'https://example.com/tiles/{z}/{x}/{y}.pbf',
      projection: 'EPSG:27700',
      tileGrid: mockTileGridInstance
    }))
  })

  it('does not set tileLoadFunction on VectorTileSource', async () => {
    await createVectorTileLayer(styleUrl, null)
    const { tileLoadFunction } = VectorTileSource.mock.calls[0][0]
    expect(tileLoadFunction).toBeUndefined()
  })

  it('creates VectorTileLayer with source and declutter true', async () => {
    await createVectorTileLayer(styleUrl, null)
    expect(VectorTileLayer).toHaveBeenCalledWith({ source: mockVectorTileSourceInstance, declutter: true })
  })

  it('applies stylefunction with layer, styleJson, sourceId, resolutions, spritesJson, spritesPngUrl', async () => {
    await createVectorTileLayer(styleUrl, null)
    expect(stylefunction).toHaveBeenCalledWith(
      mockVectorTileLayerInstance,
      mockStyleJson,
      'esri',
      expect.any(Array),
      mockSpritesJson,
      'https://example.com/sprites/sprite.png'
    )
  })

  it('returns the constructed layer and source', async () => {
    const result = await createVectorTileLayer(styleUrl, null)
    expect(result.layer).toBe(mockVectorTileLayerInstance)
    expect(result.source).toBe(mockVectorTileSourceInstance)
  })

  it('inserts sprite extension before query string when sprite URL has one', async () => {
    const styleWithQuery = { ...mockStyleJson, sprite: 'https://example.com/sprites/sprite?key=abc123' }
    global.fetch = makeVectorFetchMock(styleWithQuery)
    await createVectorTileLayer(styleUrl, null)
    expect(fetch).toHaveBeenCalledWith('https://example.com/sprites/sprite.json?key=abc123', { headers: {} })
    expect(stylefunction).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(),
      'https://example.com/sprites/sprite.png?key=abc123'
    )
  })

  it('passes transformRequest result url and headers to each fetch', async () => {
    const transformRequest = jest.fn((url) => ({
      url: url + '&auth=1',
      headers: { Authorization: 'Bearer token' }
    }))
    global.fetch = jest.fn().mockImplementation(url => {
      if (url.includes('caps.json')) { return Promise.resolve({ json: () => Promise.resolve(mockServiceJson) }) }
      if (url.includes('.json')) { return Promise.resolve({ json: () => Promise.resolve(mockSpritesJson) }) }
      return Promise.resolve({ json: () => Promise.resolve(mockStyleJson) })
    })
    await createVectorTileLayer(styleUrl, transformRequest)
    expect(fetch).toHaveBeenCalledWith(styleUrl + '&auth=1', { headers: { Authorization: 'Bearer token' } })
  })
})
