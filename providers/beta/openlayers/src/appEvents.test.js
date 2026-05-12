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
  MAP_STYLE_CHANGE: 'map:stylechange'
}

describe('attachAppEvents', () => {
  describe('raster', () => {
    function makeSetup () {
      jest.clearAllMocks()
      const layer = { setSource: jest.fn() }
      const eventBus = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
      const handles = attachAppEvents({ layer, layerType: 'raster', transformRequest: null, events, eventBus, map: null })
      const styleHandler = eventBus.on.mock.calls[0][1]
      return { layer, eventBus, handles, styleHandler }
    }

    it('subscribes to MAP_SET_STYLE on the event bus', () => {
      const { eventBus } = makeSetup()
      expect(eventBus.on).toHaveBeenCalledWith(events.MAP_SET_STYLE, expect.any(Function))
    })

    it('on MAP_SET_STYLE: creates a tile source and sets it on the layer', async () => {
      const { layer, styleHandler } = makeSetup()
      await styleHandler({ url: 'https://new.tiles.com/{z}/{x}/{y}', id: 'newStyle' })
      expect(createTileSource).toHaveBeenCalledWith('https://new.tiles.com/{z}/{x}/{y}', null)
      expect(layer.setSource).toHaveBeenCalledWith(mockSourceInstance)
    })

    it('on MAP_SET_STYLE: emits MAP_STYLE_CHANGE with the new style id', async () => {
      const { eventBus, styleHandler } = makeSetup()
      await styleHandler({ url: 'https://new.tiles.com/{z}/{x}/{y}', id: 'newStyle' })
      expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_STYLE_CHANGE, { mapStyleId: 'newStyle' })
    })

    it('remove() unsubscribes from MAP_SET_STYLE', () => {
      const { eventBus, handles, styleHandler } = makeSetup()
      handles.remove()
      expect(eventBus.off).toHaveBeenCalledWith(events.MAP_SET_STYLE, styleHandler)
    })
  })

  describe('vector', () => {
    function makeSetup () {
      jest.clearAllMocks()
      const setAt = jest.fn()
      const mockMap = { getLayers: jest.fn(() => ({ setAt })) }
      const layer = {}
      const eventBus = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
      const handles = attachAppEvents({ layer, layerType: 'vector', transformRequest: null, events, eventBus, map: mockMap })
      const styleHandler = eventBus.on.mock.calls[0][1]
      return { layer, eventBus, handles, styleHandler, setAt }
    }

    it('on MAP_SET_STYLE: creates a vector tile layer and places it at index 0', async () => {
      const { styleHandler, setAt } = makeSetup()
      await styleHandler({ url: 'https://example.com/styles', id: 'newVts' })
      expect(createVectorTileLayer).toHaveBeenCalledWith('https://example.com/styles', null)
      expect(setAt).toHaveBeenCalledWith(0, mockVectorTileLayerInstance)
    })

    it('on MAP_SET_STYLE: emits MAP_STYLE_CHANGE with the new style id', async () => {
      const { eventBus, styleHandler } = makeSetup()
      await styleHandler({ url: 'https://example.com/styles', id: 'newVts' })
      expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_STYLE_CHANGE, { mapStyleId: 'newVts' })
    })

    it('remove() unsubscribes from MAP_SET_STYLE', () => {
      const { eventBus, handles, styleHandler } = makeSetup()
      handles.remove()
      expect(eventBus.off).toHaveBeenCalledWith(events.MAP_SET_STYLE, styleHandler)
    })
  })
})
