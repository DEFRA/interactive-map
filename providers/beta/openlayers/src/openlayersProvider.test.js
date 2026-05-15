// Mock-prefixed variables are allowed in jest.mock factories by babel-plugin-jest-hoist
import OpenLayersProvider from './openlayersProvider.js'
import { attachMapEvents } from './mapEvents.js'
import { attachAppEvents, createTileSource, createVectorTileLayer } from './appEvents.js'
import { getExtentFromGeoJSON, isGeometryObscured } from './utils/spatial.js'

const mockAnimate = jest.fn()
const mockGetCenter = jest.fn(() => [400000.126, 300000.455])
const mockGetZoom = jest.fn(() => 7)
const mockGetResolution = jest.fn(() => 56)
const mockCalculateExtent = jest.fn(() => [1.005, 2.014, 3.994, 4.0])
const mockViewFit = jest.fn()
const mockViewInstance = {
  animate: mockAnimate,
  getCenter: mockGetCenter,
  getZoom: mockGetZoom,
  getResolution: mockGetResolution,
  calculateExtent: mockCalculateExtent,
  fit: mockViewFit,
  padding: null
}

const mockMapOnce = jest.fn()
const mockMapGetSize = jest.fn(() => [800, 600])
const mockMapSetTarget = jest.fn()
const mockMapGetPixel = jest.fn(() => [100, 200])
const mockMapGetCoord = jest.fn(() => [400000, 300000])
const mockMapInstance = {
  once: mockMapOnce,
  getSize: mockMapGetSize,
  setTarget: mockMapSetTarget,
  getPixelFromCoordinate: mockMapGetPixel,
  getCoordinateFromPixel: mockMapGetCoord,
  getView: jest.fn(() => mockViewInstance)
}

const mockSource = {}
const mockTileLayer = { setSource: jest.fn() }
const mockVectorTileLayer = {}
const mockMapEventHandlesRemove = jest.fn()
const mockAppEventHandlesRemove = jest.fn()

jest.mock('ol/Map.js', () => ({ __esModule: true, default: jest.fn(() => mockMapInstance) }))
jest.mock('ol/View.js', () => ({ __esModule: true, default: jest.fn(() => mockViewInstance) }))
jest.mock('ol/layer/Tile.js', () => ({ __esModule: true, default: jest.fn(() => mockTileLayer) }))
jest.mock('ol/interaction/defaults.js', () => ({ __esModule: true, defaults: jest.fn(() => []) }))
jest.mock('proj4', () => {
  const fn = jest.fn()
  fn.defs = jest.fn()
  return { __esModule: true, default: fn }
})
jest.mock('ol/proj/proj4.js', () => ({ __esModule: true, register: jest.fn() }))
jest.mock('./mapEvents.js', () => ({
  __esModule: true,
  attachMapEvents: jest.fn(() => ({ remove: mockMapEventHandlesRemove }))
}))
jest.mock('./appEvents.js', () => ({
  __esModule: true,
  createTileSource: jest.fn(() => mockSource),
  createVectorTileLayer: jest.fn(async () => ({ layer: mockVectorTileLayer, source: mockSource })),
  attachAppEvents: jest.fn(() => ({ remove: mockAppEventHandlesRemove }))
}))
jest.mock('./utils/spatial.js', () => ({
  __esModule: true,
  getAreaDimensions: jest.fn(() => '1 mile by 2 miles'),
  getCardinalMove: jest.fn(() => 'north 100m'),
  getExtentFromGeoJSON: jest.fn(() => [10, 20, 30, 40]),
  getPaddedExtent: jest.fn(() => [0, 0, 800, 600]),
  isGeometryObscured: jest.fn(() => false)
}))

const events = {
  MAP_READY: 'map:ready',
  MAP_SET_STYLE: 'map:setstyle',
  MAP_STYLE_CHANGE: 'map:stylechange'
}

const defaultInitConfig = {
  container: document.createElement('div'),
  padding: null,
  mapStyle: { id: 'myStyle', url: 'https://tiles.example.com/{z}/{x}/{y}' },
  mapSize: null,
  center: [400000, 300000],
  zoom: 7,
  bounds: null,
  minZoom: null,
  maxZoom: null,
  transformRequest: null
}

function makeProvider (mapProviderConfig = {}) {
  const eventBus = { emit: jest.fn(), on: jest.fn(), off: jest.fn() }
  const provider = new OpenLayersProvider({ events, eventBus, mapProviderConfig })
  return { provider, eventBus }
}

describe('OpenLayersProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockViewInstance.padding = null
  })

  describe('constructor', () => {
    it('sets events and eventBus on the instance', () => {
      const eventBus = { emit: jest.fn() }
      const provider = new OpenLayersProvider({ events, eventBus, mapProviderConfig: {} })
      expect(provider.events).toBe(events)
      expect(provider.eventBus).toBe(eventBus)
    })

    it('sets capabilities with supportsMapSizes true and supportedShortcuts array', () => {
      const { provider } = makeProvider()
      expect(provider.capabilities.supportsMapSizes).toBe(true)
      expect(Array.isArray(provider.capabilities.supportedShortcuts)).toBe(true)
    })

    it('spreads mapProviderConfig properties onto instance', () => {
      const { provider } = makeProvider({ zoomAlignment: 'world', customProp: 'hello' })
      expect(provider.zoomAlignment).toBe('world')
      expect(provider.customProp).toBe('hello')
    })
  })

  describe('initMap', () => {
    it('creates vector tile layer, OL objects, and emits MAP_READY by default', async () => {
      const { provider, eventBus } = makeProvider()
      await provider.initMap(defaultInitConfig)
      expect(createVectorTileLayer).toHaveBeenCalledWith(defaultInitConfig.mapStyle, null)
      expect(attachMapEvents).toHaveBeenCalled()
      expect(attachAppEvents).toHaveBeenCalled()
      expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_READY, expect.objectContaining({
        map: mockMapInstance,
        mapStyleId: 'myStyle'
      }))
    })

    it('calls map.once rendercomplete when bounds are provided', async () => {
      const { provider } = makeProvider()
      let renderCallback
      mockMapOnce.mockImplementation((event, cb) => { renderCallback = cb })
      const bounds = [100, 200, 300, 400]
      await provider.initMap({ ...defaultInitConfig, bounds })
      expect(mockMapOnce).toHaveBeenCalledWith('rendercomplete', expect.any(Function))
      renderCallback()
      expect(mockViewFit).toHaveBeenCalledWith(bounds, { size: [800, 600], duration: 0 })
    })

    it('does not call map.once when no bounds', async () => {
      const { provider } = makeProvider()
      await provider.initMap(defaultInitConfig)
      expect(mockMapOnce).not.toHaveBeenCalled()
    })

    it('calls createVectorTileLayer and skips createTileSource when mapStyle has no type', async () => {
      const { provider } = makeProvider()
      await provider.initMap(defaultInitConfig)
      expect(createVectorTileLayer).toHaveBeenCalled()
      expect(createTileSource).not.toHaveBeenCalled()
    })

    it('calls createTileSource and skips createVectorTileLayer when mapStyle.type is "raster"', async () => {
      const { provider, eventBus } = makeProvider()
      const rasterConfig = {
        ...defaultInitConfig,
        mapStyle: { id: 'myStyle', url: 'https://tiles.example.com/{z}/{x}/{y}', type: 'raster' }
      }
      await provider.initMap(rasterConfig)
      expect(createTileSource).toHaveBeenCalledWith('https://tiles.example.com/{z}/{x}/{y}', null)
      expect(createVectorTileLayer).not.toHaveBeenCalled()
      expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_READY, expect.objectContaining({ mapStyleId: 'myStyle' }))
    })

    it('passes layerType "vector" and map to attachAppEvents by default', async () => {
      const { provider } = makeProvider()
      await provider.initMap(defaultInitConfig)
      expect(attachAppEvents).toHaveBeenCalledWith(expect.objectContaining({
        layerType: 'vector',
        map: mockMapInstance
      }))
    })

    it('passes layerType "raster" to attachAppEvents when mapStyle.type is "raster"', async () => {
      const { provider } = makeProvider()
      const rasterConfig = {
        ...defaultInitConfig,
        mapStyle: { id: 'myStyle', url: 'https://tiles.example.com/{z}/{x}/{y}', type: 'raster' }
      }
      await provider.initMap(rasterConfig)
      expect(attachAppEvents).toHaveBeenCalledWith(expect.objectContaining({
        layerType: 'raster'
      }))
    })

    it('passes pixelRatio to OlMap constructor', async () => {
      const OlMap = require('ol/Map.js').default
      const { provider } = makeProvider()
      await provider.initMap({ ...defaultInitConfig, pixelRatio: 2 })
      expect(OlMap).toHaveBeenCalledWith(expect.objectContaining({ pixelRatio: 2 }))
    })

    it('passes mapProvider to attachAppEvents', async () => {
      const { provider } = makeProvider()
      await provider.initMap(defaultInitConfig)
      expect(attachAppEvents).toHaveBeenCalledWith(expect.objectContaining({ mapProvider: provider }))
    })
  })

  describe('destroyMap', () => {
    it('removes event handles, nulls map target and all references', async () => {
      const { provider } = makeProvider()
      await provider.initMap(defaultInitConfig)
      jest.clearAllMocks()

      provider.destroyMap()

      expect(mockMapEventHandlesRemove).toHaveBeenCalled()
      expect(mockAppEventHandlesRemove).toHaveBeenCalled()
      expect(mockMapSetTarget).toHaveBeenCalledWith(null)
      expect(provider.map).toBeNull()
      expect(provider.view).toBeNull()
      expect(provider.tileLayer).toBeNull()
      expect(provider.source).toBeNull()
    })

    it('does not throw when called before initMap', () => {
      const { provider } = makeProvider()
      expect(() => provider.destroyMap()).not.toThrow()
    })
  })

  describe('view control methods', () => {
    let provider

    beforeEach(async () => {
      ;({ provider } = makeProvider())
      await provider.initMap(defaultInitConfig)
      jest.clearAllMocks()
      mockViewInstance.padding = null
    })

    it('setView animates to given center and zoom', () => {
      provider.setView({ center: [500000, 400000], zoom: 8 })
      expect(mockAnimate).toHaveBeenCalledWith(expect.objectContaining({ center: [500000, 400000], zoom: 8 }))
    })

    it('setView falls back to current center and zoom when not supplied', () => {
      mockGetCenter.mockReturnValue([400000, 300000])
      mockGetZoom.mockReturnValue(7)
      provider.setView({})
      expect(mockAnimate).toHaveBeenCalledWith(expect.objectContaining({ center: [400000, 300000], zoom: 7 }))
    })

    it('zoomIn increments zoom by delta', () => {
      mockGetZoom.mockReturnValue(5)
      provider.zoomIn(2)
      expect(mockAnimate).toHaveBeenCalledWith(expect.objectContaining({ zoom: 7 }))
    })

    it('zoomOut decrements zoom by delta', () => {
      mockGetZoom.mockReturnValue(9)
      provider.zoomOut(3)
      expect(mockAnimate).toHaveBeenCalledWith(expect.objectContaining({ zoom: 6 }))
    })

    it('panBy animates center offset scaled by resolution', () => {
      mockGetCenter.mockReturnValue([400000, 300000])
      mockGetResolution.mockReturnValue(56)
      provider.panBy([10, 20])
      expect(mockAnimate).toHaveBeenCalledWith(expect.objectContaining({
        center: [400000 + 10 * 56, 300000 - 20 * 56]
      }))
    })

    it('fitToBounds passes an array extent directly to view.fit', () => {
      provider.fitToBounds([1, 2, 3, 4])
      expect(getExtentFromGeoJSON).not.toHaveBeenCalled()
      expect(mockViewFit).toHaveBeenCalledWith([1, 2, 3, 4], expect.any(Object))
    })

    it('fitToBounds converts GeoJSON to extent via getExtentFromGeoJSON', () => {
      const geojson = { type: 'Point', coordinates: [0, 51] }
      provider.fitToBounds(geojson)
      expect(getExtentFromGeoJSON).toHaveBeenCalledWith(geojson)
      expect(mockViewFit).toHaveBeenCalledWith([10, 20, 30, 40], expect.any(Object))
    })

    it('setPadding converts object to OL [top, right, bottom, left] array', () => {
      provider.setPadding({ top: 10, right: 20, bottom: 30, left: 40 })
      expect(mockViewInstance.padding).toEqual([10, 20, 30, 40])
    })

    it('setPadding fills missing keys with zero', () => {
      provider.setPadding({ top: 10 })
      expect(mockViewInstance.padding).toEqual([10, 0, 0, 0])
    })

    it('setPadding with null sets padding to undefined', () => {
      provider.setPadding(null)
      expect(mockViewInstance.padding).toBeUndefined()
    })
  })

  describe('getter methods', () => {
    let provider

    beforeEach(async () => {
      ;({ provider } = makeProvider())
      await provider.initMap(defaultInitConfig)
      jest.clearAllMocks()
    })

    it('getCenter rounds coordinates to 2 decimal places', () => {
      mockGetCenter.mockReturnValue([400000.126, 300000.455])
      expect(provider.getCenter()).toEqual([400000.13, 300000.46])
    })

    it('getZoom delegates to view.getZoom', () => {
      mockGetZoom.mockReturnValue(9)
      expect(provider.getZoom()).toBe(9)
    })

    it('getBounds rounds extent values to 2 decimal places', () => {
      mockCalculateExtent.mockReturnValue([1.126, 2.456, 3.994, 4.0])
      expect(provider.getBounds()).toEqual([1.13, 2.46, 3.99, 4])
    })

    it('getFeaturesAtPoint returns empty array', () => {
      expect(provider.getFeaturesAtPoint()).toEqual([])
    })

    it('getVisibleFeatures returns empty array', () => {
      expect(provider.getVisibleFeatures()).toEqual([])
    })

    it('getResolution delegates to view.getResolution', () => {
      mockGetResolution.mockReturnValue(28)
      expect(provider.getResolution()).toBe(28)
    })
  })

  describe('spatial helper methods', () => {
    let provider

    beforeEach(async () => {
      ;({ provider } = makeProvider())
      await provider.initMap(defaultInitConfig)
      jest.clearAllMocks()
    })

    it('getAreaDimensions delegates to spatial utils', () => {
      expect(provider.getAreaDimensions()).toBe('1 mile by 2 miles')
    })

    it('getCardinalMove delegates to spatial utils', () => {
      expect(provider.getCardinalMove([0, 0], [100, 100])).toBe('north 100m')
    })

    it('mapToScreen returns pixel as {x, y}', () => {
      mockMapGetPixel.mockReturnValue([150, 250])
      expect(provider.mapToScreen([400000, 300000])).toEqual({ x: 150, y: 250 })
    })

    it('mapToScreen returns {0, 0} when getPixelFromCoordinate returns null', () => {
      mockMapGetPixel.mockReturnValue(null)
      expect(provider.mapToScreen([400000, 300000])).toEqual({ x: 0, y: 0 })
    })

    it('mapToScreen returns {0, 0} when map is not set', () => {
      provider.map = null
      expect(provider.mapToScreen([400000, 300000])).toEqual({ x: 0, y: 0 })
    })

    it('screenToMap delegates to map.getCoordinateFromPixel', () => {
      mockMapGetCoord.mockReturnValue([400000, 300000])
      expect(provider.screenToMap({ x: 100, y: 200 })).toEqual([400000, 300000])
      expect(mockMapGetCoord).toHaveBeenCalledWith([100, 200])
    })

    it('isGeometryObscured delegates to spatial utils with map instance', () => {
      const geojson = { type: 'Point', coordinates: [0, 51] }
      const panelRect = { left: 0, top: 0, right: 100, bottom: 100 }
      provider.isGeometryObscured(geojson, panelRect)
      expect(isGeometryObscured).toHaveBeenCalledWith(geojson, panelRect, mockMapInstance)
    })
  })
})
