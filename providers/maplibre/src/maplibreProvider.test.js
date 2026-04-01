import MapLibreProvider from './maplibreProvider.js'
import { attachMapEvents } from './mapEvents.js'
import { attachAppEvents } from './appEvents.js'
import { createMapLabelNavigator } from './utils/labels.js'
import { updateHighlightedFeatures } from './utils/highlightFeatures.js'
import { queryFeatures } from './utils/queryFeatures.js'
import { registerSymbols } from './utils/symbolImages.js'
import { registerPatterns } from './utils/patternImages.js'
import { getAreaDimensions, getCardinalMove, getResolution, getPaddedBounds, isGeometryObscured } from './utils/spatial.js'

jest.mock('./defaults.js', () => ({
  DEFAULTS: { animationDuration: 400, coordinatePrecision: 7 },
  supportedShortcuts: []
}))
jest.mock('./utils/maplibreFixes.js', () => ({
  cleanCanvas: jest.fn(),
  applyPreventDefaultFix: jest.fn()
}))
jest.mock('./mapEvents.js', () => ({ attachMapEvents: jest.fn() }))
jest.mock('./appEvents.js', () => ({ attachAppEvents: jest.fn() }))
jest.mock('./utils/spatial.js', () => ({
  getAreaDimensions: jest.fn(() => '400m by 750m'),
  getCardinalMove: jest.fn(() => 'north'),
  getBboxFromGeoJSON: jest.fn(() => [-1, 50, 1, 52]),
  isGeometryObscured: jest.fn(() => true),
  getResolution: jest.fn(() => 10),
  getPaddedBounds: jest.fn(() => [[0, 0], [1, 1]])
}))
jest.mock('./utils/labels.js', () => ({
  createMapLabelNavigator: jest.fn(() => ({
    highlightNextLabel: jest.fn(() => 'next'),
    highlightLabelAtCenter: jest.fn(() => 'center'),
    clearHighlightedLabel: jest.fn(() => 'cleared')
  }))
}))
jest.mock('./utils/highlightFeatures.js', () => ({ updateHighlightedFeatures: jest.fn(() => []) }))
jest.mock('./utils/queryFeatures.js', () => ({ queryFeatures: jest.fn(() => []) }))
jest.mock('./utils/symbolImages.js', () => ({ registerSymbols: jest.fn(() => Promise.resolve()) }))
jest.mock('./utils/patternImages.js', () => ({ registerPatterns: jest.fn(() => Promise.resolve()) }))

describe('MapLibreProvider', () => {
  let map, eventBus, maplibreModule, loadCallback

  beforeEach(() => {
    loadCallback = null
    map = {
      touchZoomRotate: { disableRotation: jest.fn() },
      on: jest.fn((e, fn) => { if (e === 'load') loadCallback = fn }),
      off: jest.fn(),
      remove: jest.fn(),
      setPadding: jest.fn(),
      fitBounds: jest.fn(),
      flyTo: jest.fn(),
      easeTo: jest.fn(),
      panBy: jest.fn(),
      project: jest.fn(() => ({ x: 100, y: 200 })),
      unproject: jest.fn(() => ({ lng: 1, lat: 2 })),
      getCenter: jest.fn(() => ({ lng: 1.2345678, lat: 2.3456789 })),
      getZoom: jest.fn(() => 10),
      getBounds: jest.fn(() => ({ toArray: jest.fn(() => [[0, 0], [1, 1]]) }))
    }
    eventBus = { emit: jest.fn() }
    maplibreModule = { Map: jest.fn(() => map), LngLatBounds: jest.fn() }
  })

  const makeProvider = (config = {}) => new MapLibreProvider({
    mapFramework: maplibreModule,
    events: { MAP_READY: 'map:ready' },
    eventBus,
    ...config
  })

  const doInitMap = (p, extra = {}) => p.initMap({
    container: 'div',
    padding: {},
    mapStyle: { url: 'style.json', mapColorScheme: 'dark' },
    center: [0, 0],
    zoom: 5,
    ...extra
  })

  test('constructor spreads mapProviderConfig and sets capabilities', () => {
    const p = makeProvider({ mapProviderConfig: { crs: 'EPSG:4326', tileSize: 512 } })
    expect(p.crs).toBe('EPSG:4326')
    expect(p.tileSize).toBe(512)
    expect(p.capabilities.supportsMapSizes).toBe(true)
  })

  test('initMap: creates map, disables rotation, attaches events, emits MAP_READY', async () => {
    const p = makeProvider()
    await doInitMap(p)
    expect(maplibreModule.Map).toHaveBeenCalledWith(expect.objectContaining({ style: 'style.json' }))
    expect(map.touchZoomRotate.disableRotation).toHaveBeenCalled()
    expect(map.setPadding).toHaveBeenCalled()
    expect(attachMapEvents).toHaveBeenCalled()
    expect(attachAppEvents).toHaveBeenCalled()
    expect(eventBus.emit).toHaveBeenCalledWith('map:ready', { map, mapStyleId: undefined, mapSize: undefined, crs: undefined })
  })

  test('initMap: fitBounds called when bounds provided; skipped when absent; null mapStyle → style undefined', async () => {
    const p = makeProvider()
    await doInitMap(p, { bounds: [[0, 0], [1, 1]] })
    expect(map.fitBounds).toHaveBeenCalledWith([[0, 0], [1, 1]], { duration: 0 })

    map.fitBounds.mockClear()
    const p2 = makeProvider()
    await p2.initMap({ container: 'div', padding: {}, mapStyle: null, center: [0, 0], zoom: 5 })
    expect(map.fitBounds).not.toHaveBeenCalled()
    expect(maplibreModule.Map).toHaveBeenLastCalledWith(expect.objectContaining({ style: undefined }))
  })

  test('load callback: creates labelNavigator with mapColorScheme; undefined when mapStyle null', async () => {
    const p = makeProvider()
    await doInitMap(p)
    loadCallback()
    expect(createMapLabelNavigator).toHaveBeenCalledWith(map, 'dark', expect.anything(), eventBus)
    expect(p.labelNavigator).toBeDefined()

    createMapLabelNavigator.mockClear()
    const p2 = makeProvider()
    await p2.initMap({ container: 'div', padding: {}, mapStyle: null, center: [0, 0], zoom: 5 })
    loadCallback()
    expect(createMapLabelNavigator).toHaveBeenCalledWith(map, undefined, expect.anything(), eventBus)
  })

  test('destroyMap: calls remove on mapEvents/appEvents if set; skips if absent', async () => {
    const p = makeProvider()
    await doInitMap(p)
    const mockRemove = jest.fn()
    p.mapEvents = { remove: mockRemove }
    p.appEvents = { remove: mockRemove }
    p.destroyMap()
    expect(mockRemove).toHaveBeenCalledTimes(2)
    expect(map.remove).toHaveBeenCalled()

    const p2 = makeProvider()
    await doInitMap(p2)
    expect(() => p2.destroyMap()).not.toThrow()
  })

  test('setView: uses provided center/zoom; falls back to getCenter/getZoom when omitted', async () => {
    const p = makeProvider()
    await doInitMap(p)
    p.setView({ center: [1, 2], zoom: 8 })
    expect(map.flyTo).toHaveBeenCalledWith({ center: [1, 2], zoom: 8, duration: 400 })

    map.flyTo.mockClear()
    p.setView({})
    const call = map.flyTo.mock.calls[0][0]
    expect(call.center).toBeDefined()
    expect(call.zoom).toBe(10)
    expect(call.duration).toBe(400)
  })

  test('zoomIn, zoomOut, panBy, fitToBounds, setPadding delegate to map', async () => {
    const p = makeProvider()
    await doInitMap(p)
    p.zoomIn(1)
    expect(map.easeTo).toHaveBeenCalledWith({ zoom: 11, duration: 400 })
    p.zoomOut(2)
    expect(map.easeTo).toHaveBeenCalledWith({ zoom: 8, duration: 400 })
    p.panBy([10, 20])
    expect(map.panBy).toHaveBeenCalledWith([10, 20], { duration: 400 })
    p.fitToBounds([[0, 0], [1, 1]])
    expect(map.fitBounds).toHaveBeenCalledWith([[0, 0], [1, 1]], { duration: 400 })
    p.setPadding({ top: 5 })
    expect(map.setPadding).toHaveBeenCalledWith({ top: 5 })
  })

  test('fitToBounds accepts GeoJSON: computes bbox via getBboxFromGeoJSON', async () => {
    const { getBboxFromGeoJSON } = require('./utils/spatial.js')
    const p = makeProvider()
    await doInitMap(p)
    const feature = { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 52] }, properties: {} }

    p.fitToBounds(feature)

    expect(getBboxFromGeoJSON).toHaveBeenCalledWith(feature)
    expect(map.fitBounds).toHaveBeenCalledWith([-1, 50, 1, 52], { duration: 400 })
  })

  test('isGeometryObscured delegates to spatial utility with map instance', async () => {
    const p = makeProvider()
    await doInitMap(p)
    const geojson = { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 52] }, properties: {} }
    const panelRect = { left: 600, top: 0, right: 1000, bottom: 800, width: 400, height: 800 }

    const result = p.isGeometryObscured(geojson, panelRect)

    expect(isGeometryObscured).toHaveBeenCalledWith(geojson, panelRect, map)
    expect(result).toBe(true)
  })

  test('getCenter, getZoom, getBounds return formatted values', async () => {
    const p = makeProvider()
    await doInitMap(p)
    expect(p.getCenter()).toEqual([1.2345678, 2.3456789])
    expect(p.getZoom()).toBe(10)
    expect(p.getBounds()).toEqual([0, 0, 1, 1])
  })

  test('spatial helpers delegate correctly', async () => {
    const p = makeProvider()
    await doInitMap(p)
    expect(p.getAreaDimensions()).toBe('400m by 750m')
    expect(getPaddedBounds).toHaveBeenCalled()
    expect(getAreaDimensions).toHaveBeenCalled()
    expect(p.getCardinalMove([0, 0], [1, 1])).toBe('north')
    expect(getCardinalMove).toHaveBeenCalledWith([0, 0], [1, 1])
    p.getResolution()
    expect(getResolution).toHaveBeenCalled()
    expect(p.mapToScreen([1, 2])).toEqual({ x: 100, y: 200 })
    expect(p.screenToMap({ x: 100, y: 200 })).toEqual([1, 2])
  })

  test('getFeaturesAtPoint and updateHighlightedFeatures delegate correctly', async () => {
    const p = makeProvider()
    await doInitMap(p)
    p.getFeaturesAtPoint({ x: 10, y: 20 }, { radius: 5 })
    expect(queryFeatures).toHaveBeenCalledWith(map, { x: 10, y: 20 }, { radius: 5 })
    p.updateHighlightedFeatures(['feat'], { style: 1 })
    expect(updateHighlightedFeatures).toHaveBeenCalledWith({
      LngLatBounds: maplibreModule.LngLatBounds, map, selectedFeatures: ['feat'], stylesMap: { style: 1 }
    })
  })

  test('registerSymbols delegates to utility with map instance', async () => {
    const p = makeProvider()
    await doInitMap(p)
    const configs = [{ symbol: 'pin' }]
    const mapStyle = { id: 'test', selectedColor: '#0b0c0c' }
    const registry = {}
    await p.registerSymbols(configs, mapStyle, registry)
    expect(registerSymbols).toHaveBeenCalledWith(map, configs, mapStyle, registry)
  })

  test('registerPatterns delegates to utility with map instance', async () => {
    const p = makeProvider()
    await doInitMap(p)
    const configs = [{ fillPattern: 'dot' }]
    const registry = {}
    await p.registerPatterns(configs, 'test', registry)
    expect(registerPatterns).toHaveBeenCalledWith(map, configs, 'test', registry)
  })

  test('label methods return null without labelNavigator; delegate when set', async () => {
    const p = makeProvider()
    await doInitMap(p)
    expect(p.highlightNextLabel('ArrowRight')).toBeNull()
    expect(p.highlightLabelAtCenter()).toBeNull()
    expect(p.clearHighlightedLabel()).toBeNull()

    loadCallback()
    expect(p.highlightNextLabel('ArrowRight')).toBe('next')
    expect(p.highlightLabelAtCenter()).toBe('center')
    expect(p.clearHighlightedLabel()).toBe('cleared')
  })
})
