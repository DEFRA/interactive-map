import { attachAppEvents } from './appEvents.js'

import { createMapStyleLayer } from './utils/tileLayers.js'

const mockLayerInstance = {}
const mockSourceInstance = {}

jest.mock('./utils/tileLayers.js', () => ({
  __esModule: true,
  createMapStyleLayer: jest.fn(async () => ({ layer: mockLayerInstance, source: mockSourceInstance }))
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
  return { mapSize: 'small' }
}

describe('attachAppEvents', () => {
  describe('raster', () => {
    function makeSetup () {
      jest.clearAllMocks()
      const setAt = jest.fn()
      const map = { getLayers: jest.fn(() => ({ setAt })), setPixelRatio: jest.fn() }
      const onBaseSourceChange = jest.fn()
      const eventBus = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
      const mapProvider = makeProvider()
      const handles = attachAppEvents({ mapProvider, transformRequest: null, events, eventBus, map, onBaseSourceChange })
      const handlerFor = (event) => eventBus.on.mock.calls.find(c => c[0] === event)[1]
      return { map, setAt, onBaseSourceChange, eventBus, handles, handlerFor, mapProvider }
    }

    it('subscribes to MAP_SET_STYLE on the event bus', () => {
      const { eventBus } = makeSetup()
      expect(eventBus.on).toHaveBeenCalledWith(events.MAP_SET_STYLE, expect.any(Function))
    })

    it('on MAP_SET_STYLE: creates a map style layer and places it at index 0', async () => {
      const { setAt, handlerFor } = makeSetup()
      const mapStyle = { url: 'https://new.tiles.com/{z}/{x}/{y}', id: 'newStyle', type: 'raster' }
      await handlerFor(events.MAP_SET_STYLE)(mapStyle)
      expect(createMapStyleLayer).toHaveBeenCalledWith(mapStyle, null)
      expect(setAt).toHaveBeenCalledWith(0, mockLayerInstance)
    })

    it('on MAP_SET_STYLE: updates the base source for map events', async () => {
      const { onBaseSourceChange, handlerFor } = makeSetup()
      await handlerFor(events.MAP_SET_STYLE)({ url: 'https://new.tiles.com/{z}/{x}/{y}', id: 'newStyle', type: 'raster' })
      expect(onBaseSourceChange).toHaveBeenCalledWith(mockSourceInstance)
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
      const handles = attachAppEvents({ mapProvider, transformRequest: null, events, eventBus, map, onBaseSourceChange: jest.fn() })
      const handlerFor = (event) => eventBus.on.mock.calls.find(c => c[0] === event)[1]
      return { map, setAt, eventBus, handles, handlerFor, mapProvider }
    }

    it('on MAP_SET_STYLE: creates a vector tile layer and places it at index 0', async () => {
      const { setAt, handlerFor } = makeSetup()
      const mapStyle = { url: 'https://example.com/styles', id: 'newVts' }
      await handlerFor(events.MAP_SET_STYLE)(mapStyle)
      expect(createMapStyleLayer).toHaveBeenCalledWith(mapStyle, null)
      expect(setAt).toHaveBeenCalledWith(0, mockLayerInstance)
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
      attachAppEvents({ mapProvider, transformRequest: null, events, eventBus, map, onBaseSourceChange: jest.fn() })
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
