import { attachAppEvents } from './appEvents.js'

import { createTileSource, createVectorTileLayer } from './utils/tileLayers.js'

const mockSourceInstance = {}
const mockVectorTileLayerInstance = {}

jest.mock('./utils/tileLayers.js', () => ({
  __esModule: true,
  createTileSource: jest.fn(() => mockSourceInstance),
  createVectorTileLayer: jest.fn(async () => ({ layer: mockVectorTileLayerInstance, source: {} }))
}))

const events = {
  MAP_SET_STYLE: 'map:setstyle',
  MAP_STYLE_CHANGE: 'map:stylechange',
  MAP_SET_PIXEL_RATIO: 'map:setpixelratio',
  MAP_SIZE_CHANGE: 'map:sizechange'
}

function makeMap () {
  return { getLayers: jest.fn(() => ({ setAt: jest.fn() })), setPixelRatio: jest.fn() }
}

function makeProvider () {
  return { mapSize: 'small', reapplyHighlights: jest.fn() }
}

describe('attachAppEvents', () => {
  describe('raster', () => {
    function makeSetup () {
      jest.clearAllMocks()
      const layer = { setSource: jest.fn() }
      const eventBus = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
      const mapProvider = makeProvider()
      const handles = attachAppEvents({ mapProvider, layer, layerType: 'raster', transformRequest: null, events, eventBus, map: makeMap() })
      const handlerFor = (event) => eventBus.on.mock.calls.find(c => c[0] === event)[1]
      return { layer, eventBus, handles, handlerFor, mapProvider }
    }

    it('subscribes to MAP_SET_STYLE on the event bus', () => {
      const { eventBus } = makeSetup()
      expect(eventBus.on).toHaveBeenCalledWith(events.MAP_SET_STYLE, expect.any(Function))
    })

    it('on MAP_SET_STYLE: creates a tile source and sets it on the layer', async () => {
      const { layer, handlerFor } = makeSetup()
      await handlerFor(events.MAP_SET_STYLE)({ url: 'https://new.tiles.com/{z}/{x}/{y}', id: 'newStyle' })
      expect(createTileSource).toHaveBeenCalledWith('https://new.tiles.com/{z}/{x}/{y}', null)
      expect(layer.setSource).toHaveBeenCalledWith(mockSourceInstance)
    })

    it('on MAP_SET_STYLE: emits MAP_STYLE_CHANGE with the new style id', async () => {
      const { eventBus, handlerFor } = makeSetup()
      await handlerFor(events.MAP_SET_STYLE)({ url: 'https://new.tiles.com/{z}/{x}/{y}', id: 'newStyle' })
      expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_STYLE_CHANGE, { mapStyleId: 'newStyle' })
    })

    it('remove() unsubscribes all handlers', () => {
      const { eventBus, handles, handlerFor } = makeSetup()
      handles.remove()
      expect(eventBus.off).toHaveBeenCalledWith(events.MAP_SET_STYLE, handlerFor(events.MAP_SET_STYLE))
      expect(eventBus.off).toHaveBeenCalledWith(events.MAP_SET_PIXEL_RATIO, handlerFor(events.MAP_SET_PIXEL_RATIO))
      expect(eventBus.off).toHaveBeenCalledWith(events.MAP_SIZE_CHANGE, handlerFor(events.MAP_SIZE_CHANGE))
    })
  })

  describe('vector', () => {
    function makeSetup () {
      jest.clearAllMocks()
      const setAt = jest.fn()
      const map = { getLayers: jest.fn(() => ({ setAt })), setPixelRatio: jest.fn() }
      const eventBus = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
      const mapProvider = makeProvider()
      const handles = attachAppEvents({ mapProvider, layer: {}, layerType: 'vector', transformRequest: null, events, eventBus, map })
      const handlerFor = (event) => eventBus.on.mock.calls.find(c => c[0] === event)[1]
      return { map, setAt, eventBus, handles, handlerFor, mapProvider }
    }

    it('on MAP_SET_STYLE: creates a vector tile layer and places it at index 0', async () => {
      const { setAt, handlerFor } = makeSetup()
      const mapStyle = { url: 'https://example.com/styles', id: 'newVts' }
      await handlerFor(events.MAP_SET_STYLE)(mapStyle)
      expect(createVectorTileLayer).toHaveBeenCalledWith(mapStyle.url, null, mapStyle)
      expect(setAt).toHaveBeenCalledWith(0, mockVectorTileLayerInstance)
    })

    it('on MAP_SET_STYLE: emits MAP_STYLE_CHANGE with the new style id', async () => {
      const { eventBus, handlerFor } = makeSetup()
      await handlerFor(events.MAP_SET_STYLE)({ url: 'https://example.com/styles', id: 'newVts' })
      expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_STYLE_CHANGE, { mapStyleId: 'newVts' })
    })
  })

  describe('pixel ratio and map size', () => {
    function makeSetup () {
      jest.clearAllMocks()
      const map = makeMap()
      const eventBus = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
      const mapProvider = makeProvider()
      attachAppEvents({ mapProvider, layer: {}, layerType: 'vector', transformRequest: null, events, eventBus, map })
      const handlerFor = (event) => eventBus.on.mock.calls.find(c => c[0] === event)[1]
      return { map, mapProvider, handlerFor }
    }

    it('on MAP_SET_PIXEL_RATIO: calls map.setPixelRatio with the new ratio', () => {
      const { map, handlerFor } = makeSetup()
      handlerFor(events.MAP_SET_PIXEL_RATIO)(3)
      expect(map.setPixelRatio).toHaveBeenCalledWith(3)
    })

    it('on MAP_SIZE_CHANGE: updates mapProvider.mapSize', () => {
      const { mapProvider, handlerFor } = makeSetup()
      handlerFor(events.MAP_SIZE_CHANGE)({ mapSize: 'large' })
      expect(mapProvider.mapSize).toBe('large')
    })
  })
})
