import MapLibreProvider from './maplibreProvider.js'
import { attachMapEvents } from './mapEvents.js'
import { attachAppEvents } from './appEvents.js'
import { createMapLabelNavigator } from './utils/labels.js'
import { updateHighlightedFeatures } from './utils/highlightFeatures.js'
import { queryFeatures } from './utils/queryFeatures.js'
import { SymbolImageVariants, getSymbolIconLayout } from './utils/symbolImages.js'
import { PatternImages } from './utils/patternImages.js'
import { getAreaDimensions, getCardinalMove, getResolution, getPaddedBounds } from './utils/spatial.js'
import { createSymbolRegistry } from '../../../src/services/symbolRegistry.js'

const symbolRegistry = createSymbolRegistry()

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
jest.mock('./utils/symbolImages.js', () => ({
  ...jest.requireActual('./utils/symbolImages.js'),
  getSymbolIconLayout: jest.fn(() => ({ 'icon-anchor': 'bottom', 'icon-offset': [0, 2] }))
}))

describe('MapLibreProvider', () => {
  let map, eventBus, maplibreModule, loadCallback

  beforeEach(() => {
    loadCallback = null
    map = {
      touchZoomRotate: { disableRotation: jest.fn() },
      on: jest.fn((e, fn) => { if (e === 'load') loadCallback = fn }),
      once: jest.fn(),
      off: jest.fn(),
      remove: jest.fn(),
      setPadding: jest.fn(),
      fitBounds: jest.fn(),
      isStyleLoaded: jest.fn(() => true),
      flyTo: jest.fn(),
      easeTo: jest.fn(),
      panBy: jest.fn(),
      project: jest.fn(() => ({ x: 100, y: 200 })),
      unproject: jest.fn(() => ({ lng: 1, lat: 2 })),
      getCenter: jest.fn(() => ({ lng: 1.2345678, lat: 2.3456789 })),
      getZoom: jest.fn(() => 10),
      getBounds: jest.fn(() => ({ toArray: jest.fn(() => [[0, 0], [1, 1]]) })),
      getPixelRatio: jest.fn(() => 1),
      getCanvas: jest.fn(() => ({ style: {} })),
      getLayer: jest.fn(() => true),
      queryRenderedFeatures: jest.fn(() => []),
      getStyle: jest.fn(() => ({ layers: [] }))
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

  const doInitMap = (provider, extra = {}) => provider.initMap({
    container: 'div',
    padding: {},
    mapStyle: { url: 'style.json', mapColorScheme: 'dark' },
    center: [0, 0],
    zoom: 5,
    ...extra
  })

  test('it should have a name getter', () => {
    const provider = makeProvider()
    expect(provider.name).toBe('MapLibreProvider')
  })

  test('constructor spreads mapProviderConfig and sets capabilities', () => {
    const provider = makeProvider({ mapProviderConfig: { crs: 'EPSG:4326', tileSize: 512 } })
    expect(provider.crs).toBe('EPSG:4326')
    expect(provider.tileSize).toBe(512)
    expect(provider.capabilities.supportsMapSizes).toBe(true)
  })

  test('initMap: creates map, disables rotation, attaches events, emits MAP_READY', async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    expect(maplibreModule.Map).toHaveBeenCalledWith(expect.objectContaining({ style: 'style.json' }))
    expect(map.touchZoomRotate.disableRotation).toHaveBeenCalled()
    expect(map.setPadding).toHaveBeenCalled()
    expect(attachMapEvents).toHaveBeenCalled()
    expect(attachAppEvents).toHaveBeenCalled()
    expect(eventBus.emit).toHaveBeenCalledWith('map:ready', { map, mapStyleId: undefined, mapSize: undefined, crs: undefined })
  })

  test('initMap: fitBounds called when bounds provided; skipped when absent; null mapStyle → style undefined', async () => {
    const provider = makeProvider()
    await doInitMap(provider, { bounds: [[0, 0], [1, 1]] })
    expect(map.fitBounds).toHaveBeenCalledWith([[0, 0], [1, 1]], { duration: 0 })

    map.fitBounds.mockClear()
    const p2 = makeProvider()
    await p2.initMap({ container: 'div', padding: {}, mapStyle: null, center: [0, 0], zoom: 5 })
    expect(map.fitBounds).not.toHaveBeenCalled()
    expect(maplibreModule.Map).toHaveBeenLastCalledWith(expect.objectContaining({ style: undefined }))
  })

  test('load callback: creates labelNavigator with mapColorScheme; undefined when mapStyle null', async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    loadCallback()
    expect(createMapLabelNavigator).toHaveBeenCalledWith(map, 'dark', expect.anything(), eventBus)
    expect(provider.labelNavigator).toBeDefined()

    createMapLabelNavigator.mockClear()
    const p2 = makeProvider()
    await p2.initMap({ container: 'div', padding: {}, mapStyle: null, center: [0, 0], zoom: 5 })
    loadCallback()
    expect(createMapLabelNavigator).toHaveBeenCalledWith(map, undefined, expect.anything(), eventBus)
  })

  describe('isBaseMapReady', () => {
    test('returns the result of map.getStyle() after map is initialised', async () => {
      const provider = makeProvider()
      await doInitMap(provider)
      const style = { layers: [{ id: 'background' }] }
      map.getStyle.mockReturnValue(style)
      expect(provider.isBaseMapReady()).toEqual(true)
    })

    test('returns undefined when map has not been initialised', () => {
      const provider = makeProvider()
      expect(provider.isBaseMapReady()).toEqual(false)
    })

    test('returns undefined when map.getStyle() returns undefined', async () => {
      const provider = makeProvider()
      await doInitMap(provider)
      map.getStyle.mockReturnValue(undefined)
      expect(provider.isBaseMapReady()).toEqual(false)
    })
  })

  test('destroyMap: calls remove on mapEvents/appEvents if set; skips if absent', async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    const mockRemove = jest.fn()
    provider.mapEvents = { remove: mockRemove }
    provider.appEvents = { remove: mockRemove }
    provider.destroyMap()
    expect(mockRemove).toHaveBeenCalledTimes(2)
    expect(map.remove).toHaveBeenCalled()

    const p2 = makeProvider()
    await doInitMap(p2)
    expect(() => p2.destroyMap()).not.toThrow()
  })

  test('setView: uses provided center/zoom; falls back to getCenter/getZoom when omitted', async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    provider.setView({ center: [1, 2], zoom: 8 })
    expect(map.flyTo).toHaveBeenCalledWith({ center: [1, 2], zoom: 8, duration: 400 })

    map.flyTo.mockClear()
    provider.setView({})
    const call = map.flyTo.mock.calls[0][0]
    expect(call.center).toBeDefined()
    expect(call.zoom).toBe(10)
    expect(call.duration).toBe(400)
  })

  test('setView uses duration 0 when style is not yet loaded', async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    map.isStyleLoaded.mockReturnValue(false)

    provider.setView({ center: [1, 2], zoom: 8 })

    expect(map.flyTo).toHaveBeenCalledWith({ center: [1, 2], zoom: 8, duration: 0 })
  })

  test('zoomIn, zoomOut, panBy, fitToBounds, setPadding delegate to map', async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    provider.zoomIn(1)
    expect(map.easeTo).toHaveBeenCalledWith({ zoom: 11, duration: 400 })
    provider.zoomOut(2)
    expect(map.easeTo).toHaveBeenCalledWith({ zoom: 8, duration: 400 })
    provider.panBy([10, 20])
    expect(map.panBy).toHaveBeenCalledWith([10, 20], { duration: 400 })
    provider.fitToBounds([[0, 0], [1, 1]])
    expect(map.fitBounds).toHaveBeenCalledWith([[0, 0], [1, 1]], { duration: 400 })
    provider.setPadding({ top: 5 })
    expect(map.setPadding).toHaveBeenCalledWith({ top: 5 })
  })

  test('fitToBounds passes extra padding to fitBounds', async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    const padding = { top: 10, right: 20, bottom: 30, left: 40 }

    provider.fitToBounds([[0, 0], [1, 1]], { padding })

    expect(map.fitBounds).toHaveBeenCalledWith([[0, 0], [1, 1]], { duration: 400, padding })
  })

  test('fitToBounds uses duration 0 when style is not yet loaded', async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    map.isStyleLoaded.mockReturnValue(false)

    provider.fitToBounds([[0, 0], [1, 1]])

    expect(map.fitBounds).toHaveBeenCalledWith([[0, 0], [1, 1]], { duration: 0 })
  })

  test('fitToBounds accepts GeoJSON: computes bbox via getBboxFromGeoJSON', async () => {
    const { getBboxFromGeoJSON } = require('./utils/spatial.js')
    const provider = makeProvider()
    await doInitMap(provider)
    const feature = { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 52] }, properties: {} }

    provider.fitToBounds(feature)

    expect(getBboxFromGeoJSON).toHaveBeenCalledWith(feature)
    expect(map.fitBounds).toHaveBeenCalledWith([-1, 50, 1, 52], { duration: 400 })
  })

  test('getCenter, getZoom, getBounds return formatted values', async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    expect(provider.getCenter()).toEqual([1.2345678, 2.3456789])
    expect(provider.getZoom()).toBe(10)
    expect(provider.getBounds()).toEqual([0, 0, 1, 1])
  })

  test('spatial helpers delegate correctly', async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    expect(provider.getAreaDimensions()).toBe('400m by 750m')
    expect(getPaddedBounds).toHaveBeenCalled()
    expect(getAreaDimensions).toHaveBeenCalled()
    expect(provider.getCardinalMove([0, 0], [1, 1])).toBe('north')
    expect(getCardinalMove).toHaveBeenCalledWith([0, 0], [1, 1])
    provider.getResolution()
    expect(getResolution).toHaveBeenCalled()
    expect(provider.mapToScreen([1, 2])).toEqual({ x: 100, y: 200 })
    expect(provider.screenToMap({ x: 100, y: 200 })).toEqual([1, 2])
  })

  test('getFeaturesAtPoint and updateHighlightedFeatures delegate correctly', async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    provider.getFeaturesAtPoint({ x: 10, y: 20 }, { radius: 5 })
    expect(queryFeatures).toHaveBeenCalledWith(map, { x: 10, y: 20 }, { radius: 5 })
    provider.updateHighlightedFeatures(['feat'], null, { style: 1 })
    expect(updateHighlightedFeatures).toHaveBeenCalledWith({
      LngLatBounds: maplibreModule.LngLatBounds, map, selectedFeatures: ['feat'], activeFeatures: null, stylesMap: { style: 1 }, symbolImages: provider.symbolImages
    })
  })

  test('getVisibleFeatures returns empty array when no layers are present on the map', async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    map.getLayer.mockReturnValue(null)
    expect(provider.getVisibleFeatures(['l1', 'l2'])).toEqual([])
    expect(map.queryRenderedFeatures).not.toHaveBeenCalled()
  })

  test('getVisibleFeatures queries only layers present on the map', async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    map.getLayer.mockImplementation(id => id === 'l1' ? {} : null) // NOSONAR
    const features = [{ id: 'f1' }]
    map.queryRenderedFeatures.mockReturnValue(features)
    expect(provider.getVisibleFeatures(['l1', 'l2'])).toEqual(features)
    expect(map.queryRenderedFeatures).toHaveBeenCalledWith(undefined, { layers: ['l1'] })
  })

  // The provider's own record of registered symbol images, created with its map
  const initWithSymbolImages = async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    const registerSymbols = jest.spyOn(provider.symbolImages, 'registerSymbols').mockResolvedValue()
    return { provider, registerSymbols }
  }

  test('owns a SymbolImageVariants for its map', async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    expect(provider.symbolImages).toBeInstanceOf(SymbolImageVariants)
    expect(provider.symbolImages.map).toBe(map)
  })

  test('addSymbolsToMap registers the symbols with its symbol images', async () => {
    const { provider, registerSymbols } = await initWithSymbolImages()
    const configs = [{ symbol: 'pin' }]
    const mapStyle = { id: 'test', selectedColor: '#0b0c0c' }
    await provider.addSymbolsToMap(configs, mapStyle, symbolRegistry)
    expect(registerSymbols).toHaveBeenCalledWith(configs, mapStyle, symbolRegistry, expect.any(Number))
  })

  test('addSymbolsToMap computes pixelRatio from getPixelRatio and mapSize scale factor', async () => {
    const { provider, registerSymbols } = await initWithSymbolImages()
    map.getPixelRatio.mockReturnValue(2)
    provider.mapSize = 'medium'
    await provider.addSymbolsToMap([], { id: 'test' }, symbolRegistry)
    expect(registerSymbols).toHaveBeenCalledWith([], { id: 'test' }, symbolRegistry, 2)
  })

  test('addSymbolsToMap registers at a given pixelRatio instead of the map\'s', async () => {
    const { provider, registerSymbols } = await initWithSymbolImages()
    map.getPixelRatio.mockReturnValue(2)
    await provider.addSymbolsToMap([], { id: 'test' }, symbolRegistry, 3)
    expect(registerSymbols).toHaveBeenCalledWith([], { id: 'test' }, symbolRegistry, 3)
  })

  test('getSymbolIconLayout delegates to the symbol image utility', () => {
    const symbolDef = { anchor: [0.5, 0.9], viewBox: '0 0 44 44' }
    expect(makeProvider().getSymbolIconLayout(symbolDef)).toEqual({ 'icon-anchor': 'bottom', 'icon-offset': [0, 2] })
    expect(getSymbolIconLayout).toHaveBeenCalledWith(symbolDef)
  })

  test('looks up a registered symbol\'s active and selected variants', async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    expect(provider.getActiveSymbolImageId('img')).toBeNull()
    expect(provider.getSelectedSymbolImageId('img')).toBeNull()
    provider.symbolImages.activeImageIds.set('img', 'img-active')
    provider.symbolImages.selectedImageIds.set('img', 'img-selected')
    expect(provider.getActiveSymbolImageId('img')).toBe('img-active')
    expect(provider.getSelectedSymbolImageId('img')).toBe('img-selected')
  })

  test('addSymbolsToMap falls back to pixelRatio 1 when getPixelRatio returns 0', async () => {
    const { provider, registerSymbols } = await initWithSymbolImages()
    map.getPixelRatio.mockReturnValue(0)
    provider.mapSize = 'small' // scaleFactor['small'] = 1
    await provider.addSymbolsToMap([], { id: 'test' }, symbolRegistry)
    expect(registerSymbols).toHaveBeenCalledWith([], { id: 'test' }, symbolRegistry, 1)
  })

  // The provider's own pattern images, created with its map
  const initWithPatternImages = async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    const registerPatterns = jest.spyOn(provider.patternImages, 'registerPatterns').mockResolvedValue()
    return { provider, registerPatterns }
  }

  test('owns a PatternImages for its map', async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    expect(provider.patternImages).toBeInstanceOf(PatternImages)
    expect(provider.patternImages.map).toBe(map)
  })

  test('addPatternsToMap falls back to pixelRatio 1 when getPixelRatio returns 0', async () => {
    const { provider, registerPatterns } = await initWithPatternImages()
    map.getPixelRatio.mockReturnValue(0)
    const configs = [{ fillPattern: 'dot' }]
    const registry = {}
    await provider.addPatternsToMap(configs, 'test', registry)
    expect(registerPatterns).toHaveBeenCalledWith(configs, 'test', registry, 1)
  })

  test('addPatternsToMap registers at the map\'s pixel ratio, or a given one', async () => {
    const { provider, registerPatterns } = await initWithPatternImages()
    map.getPixelRatio.mockReturnValue(2)
    const registry = {}
    await provider.addPatternsToMap([], 'test', registry)
    expect(registerPatterns).toHaveBeenLastCalledWith([], 'test', registry, 2)
    await provider.addPatternsToMap([], 'test', registry, 3)
    expect(registerPatterns).toHaveBeenLastCalledWith([], 'test', registry, 3)
  })

  describe('setHoverCursor', () => {
    test('registers mousemove handler on the map when layerIds provided', async () => {
      const provider = makeProvider()
      await doInitMap(provider)
      provider.setHoverCursor(['layer-a'])
      expect(map.on).toHaveBeenCalledWith('mousemove', expect.any(Function))
    })

    test('sets cursor to pointer when queryRenderedFeatures returns a hit', async () => {
      const canvas = { style: {} }
      map.getCanvas.mockReturnValue(canvas)
      map.queryRenderedFeatures.mockReturnValue([{ id: 'f1' }])

      const provider = makeProvider()
      await doInitMap(provider)
      provider.setHoverCursor(['layer-a'])

      const moveHandler = map.on.mock.calls.find(([e]) => e === 'mousemove')?.[1]
      moveHandler({ point: { x: 10, y: 20 } })

      expect(canvas.style.cursor).toBe('pointer')
    })

    test('clears cursor when queryRenderedFeatures returns no hit', async () => {
      const canvas = { style: { cursor: 'pointer' } }
      map.getCanvas.mockReturnValue(canvas)
      map.queryRenderedFeatures.mockReturnValue([])

      const provider = makeProvider()
      await doInitMap(provider)
      provider.setHoverCursor(['layer-a'])

      const moveHandler = map.on.mock.calls.find(([e]) => e === 'mousemove')?.[1]
      moveHandler({ point: { x: 10, y: 20 } })

      expect(canvas.style.cursor).toBe('')
    })

    test('removes mousemove handler and clears cursor when called with empty array', async () => {
      const canvas = { style: { cursor: 'pointer' } }
      map.getCanvas.mockReturnValue(canvas)

      const provider = makeProvider()
      await doInitMap(provider)
      provider.setHoverCursor(['layer-a'])
      provider.setHoverCursor([])

      expect(map.off).toHaveBeenCalledWith('mousemove', expect.any(Function))
      expect(canvas.style.cursor).toBe('')
    })

    test('does nothing when map is not initialised', () => {
      const provider = makeProvider()
      expect(() => provider.setHoverCursor(['layer-a'])).not.toThrow()
    })
  })

  test('label methods return null without labelNavigator; delegate when set', async () => {
    const provider = makeProvider()
    await doInitMap(provider)
    expect(provider.highlightNextLabel('ArrowRight')).toBeNull()
    expect(provider.highlightLabelAtCenter()).toBeNull()
    expect(provider.clearHighlightedLabel()).toBeNull()

    loadCallback()
    expect(provider.highlightNextLabel('ArrowRight')).toBe('next')
    expect(provider.highlightLabelAtCenter()).toBe('center')
    expect(provider.clearHighlightedLabel()).toBe('cleared')
  })
})
