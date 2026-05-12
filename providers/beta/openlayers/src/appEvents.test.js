import XYZ from 'ol/source/XYZ.js'
import TileGrid from 'ol/tilegrid/TileGrid.js'
import { createTileSource, attachAppEvents } from './appEvents.js'
import { TILE_GRID_RESOLUTIONS, TILE_GRID_ORIGIN, TILE_SIZE } from './defaults.js'

const mockTileGridInstance = {}
const mockSourceInstance = {}

jest.mock('ol/source/XYZ.js', () => ({ __esModule: true, default: jest.fn(() => mockSourceInstance) }))
jest.mock('ol/tilegrid/TileGrid.js', () => ({ __esModule: true, default: jest.fn(() => mockTileGridInstance) }))
jest.mock('ol/TileState.js', () => ({ __esModule: true, default: { ERROR: 'error' } }))

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

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

describe('attachAppEvents', () => {
  const events = {
    MAP_SET_STYLE: 'map:setstyle',
    MAP_STYLE_CHANGE: 'map:stylechange'
  }

  function makeSetup () {
    jest.clearAllMocks()
    const tileLayer = { setSource: jest.fn() }
    const eventBus = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
    const handles = attachAppEvents({ tileLayer, transformRequest: null, events, eventBus })
    const styleHandler = eventBus.on.mock.calls[0][1]
    return { tileLayer, eventBus, handles, styleHandler }
  }

  it('subscribes to MAP_SET_STYLE on the event bus', () => {
    const { eventBus } = makeSetup()
    expect(eventBus.on).toHaveBeenCalledWith(events.MAP_SET_STYLE, expect.any(Function))
  })

  it('on MAP_SET_STYLE: updates tile layer source and emits MAP_STYLE_CHANGE', () => {
    const { tileLayer, eventBus, styleHandler } = makeSetup()
    styleHandler({ url: 'https://new.tiles.com/{z}/{x}/{y}', id: 'newStyle' })
    expect(tileLayer.setSource).toHaveBeenCalledWith(mockSourceInstance)
    expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_STYLE_CHANGE, { mapStyleId: 'newStyle' })
  })

  it('remove() unsubscribes from MAP_SET_STYLE', () => {
    const { eventBus, handles, styleHandler } = makeSetup()
    handles.remove()
    expect(eventBus.off).toHaveBeenCalledWith(events.MAP_SET_STYLE, styleHandler)
  })
})
