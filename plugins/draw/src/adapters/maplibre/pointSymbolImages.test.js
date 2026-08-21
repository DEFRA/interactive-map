import { hasSymbolStyle, getPixelRatio, resolvePointSymbol, refreshAllPointSymbols } from './pointSymbolImages.js'
import { symbolRegistry } from '../../../../../src/services/symbolRegistry.js'

const mapStyle = { id: 'outdoor', mapColorScheme: 'light' }

const createMap = ({ pixelRatio = 2 } = {}) => ({
  _drawCurrentMapStyle: mapStyle,
  getPixelRatio: () => pixelRatio
})

const createMapProvider = () => ({
  addSymbolsToMap: jest.fn(() => Promise.resolve())
})

const createStore = (features = []) => ({
  get: jest.fn((id) => features.find((f) => f.id === id) ?? null),
  write: jest.fn(),
  getAll: jest.fn(() => features)
})

const point = (id, properties, coordinates = [1, 2]) =>
  ({ id, type: 'Feature', geometry: { type: 'Point', coordinates }, properties })

describe('hasSymbolStyle', () => {
  it('is true when symbol is set', () => {
    expect(hasSymbolStyle({ symbol: 'pin' })).toBe(true)
  })

  it('is true when symbolSvgContent is set', () => {
    expect(hasSymbolStyle({ symbolSvgContent: '<path/>' })).toBe(true)
  })

  it('is false with neither, or no properties at all', () => {
    expect(hasSymbolStyle({})).toBe(false)
    expect(hasSymbolStyle(undefined)).toBe(false)
  })
})

describe('getPixelRatio', () => {
  it('reads map.getPixelRatio()', () => {
    expect(getPixelRatio(createMap({ pixelRatio: 3 }))).toBe(3)
  })

  it('falls back to 1 when getPixelRatio is unavailable or falsy', () => {
    expect(getPixelRatio({})).toBe(1)
    expect(getPixelRatio({ getPixelRatio: () => 0 })).toBe(1)
  })
})

describe('resolvePointSymbol', () => {
  it('does nothing for a feature with no symbol config', async () => {
    const map = createMap()
    const mapProvider = createMapProvider()
    const store = createStore()
    await resolvePointSymbol({ store, mapProvider, map, featureId: 'p1', properties: {} })
    expect(mapProvider.addSymbolsToMap).not.toHaveBeenCalled()
    expect(store.write).not.toHaveBeenCalled()
  })

  it('registers the symbol image and re-writes the feature with symbolImageId/symbolIconAnchor/symbolIconOffset, forcing a render', async () => {
    const map = createMap()
    const mapProvider = createMapProvider()
    const properties = { symbol: 'pin', label: 'a point' }
    const store = createStore([point('p1', properties)])

    await resolvePointSymbol({ store, mapProvider, map, featureId: 'p1', properties })

    expect(mapProvider.addSymbolsToMap).toHaveBeenCalledWith([properties], mapStyle, symbolRegistry)
    const expectedImageId = symbolRegistry.getSymbolImageId(properties, mapStyle, false, 2)
    expect(store.write).toHaveBeenCalledWith({
      id: 'p1',
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [1, 2] },
      properties: {
        ...properties,
        symbolImageId: expectedImageId,
        symbolIconAnchor: 'bottom', // pin's default anchor [0.5, 0.9] snaps to icon-anchor 'bottom'
        symbolIconOffset: [0, 4.4], // ...and icon-offset corrects the precision lost snapping 0.9 to 1.0 (44px viewBox)
        // Nothing registered in map._activeSymbolImageMap/_selectedSymbolImageMap here since
        // addSymbolsToMap is mocked out (a no-op) in this test — see the dedicated test below
        // for the case where it actually populates them.
        symbolActiveImageId: null,
        symbolSelectedImageId: null
      }
    })
  })

  it('reads the active/selected variant ids back from map._activeSymbolImageMap/_selectedSymbolImageMap once addSymbolsToMap has registered them', async () => {
    const map = createMap()
    const properties = { symbol: 'pin' }
    const store = createStore([point('p1', properties)])
    const expectedImageId = symbolRegistry.getSymbolImageId(properties, mapStyle, false, 2)
    // Simulates what the real addSymbolsToMap (providers/maplibre/src/utils/symbolImages.js)
    // does as a side effect: populate these maps, keyed by the normal variant's own id.
    const mapProvider = {
      addSymbolsToMap: jest.fn(() => {
        map._activeSymbolImageMap = { [expectedImageId]: 'symbol-act-xyz' }
        map._selectedSymbolImageMap = { [expectedImageId]: 'symbol-sel-xyz' }
        return Promise.resolve()
      })
    }

    await resolvePointSymbol({ store, mapProvider, map, featureId: 'p1', properties })

    expect(store.write).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({
        symbolActiveImageId: 'symbol-act-xyz',
        symbolSelectedImageId: 'symbol-sel-xyz'
      })
    }))
  })

  it('does nothing when getSymbolImageId resolves null (e.g. an unresolvable symbol id)', async () => {
    const map = createMap()
    const mapProvider = createMapProvider()
    const properties = { symbol: 'not-a-real-symbol' }
    const store = createStore([point('p1', properties)])
    const spy = jest.spyOn(symbolRegistry, 'getSymbolImageId').mockReturnValueOnce(null)

    await resolvePointSymbol({ store, mapProvider, map, featureId: 'p1', properties })

    expect(store.write).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('does not re-write the feature if it was deleted while registration was in flight', async () => {
    const map = createMap()
    const properties = { symbol: 'pin' }
    let resolveRegistration
    const mapProvider = { addSymbolsToMap: jest.fn(() => new Promise((resolve) => { resolveRegistration = resolve })) }
    const store = createStore() // empty — feature already gone

    const pending = resolvePointSymbol({ store, mapProvider, map, featureId: 'p1', properties })
    resolveRegistration()
    await pending

    expect(store.write).not.toHaveBeenCalled()
  })

  it('uses a custom symbolAnchor when the style provides one, with no offset needed for an on-grid anchor', async () => {
    const map = createMap()
    const mapProvider = createMapProvider()
    const properties = { symbol: 'circle', symbolAnchor: [0, 0] }
    const store = createStore([point('p1', properties)])

    await resolvePointSymbol({ store, mapProvider, map, featureId: 'p1', properties })

    expect(store.write).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({ symbolIconAnchor: 'top-left', symbolIconOffset: [0, 0] })
    }))
  })

  it('computes a non-zero icon-offset for an off-grid custom symbolAnchor', async () => {
    const map = createMap()
    const mapProvider = createMapProvider()
    const properties = { symbol: 'circle', symbolAnchor: [0.5, 0.8] }
    const store = createStore([point('p1', properties)])

    await resolvePointSymbol({ store, mapProvider, map, featureId: 'p1', properties })

    // circle's viewBox is 44×44 — anchor 0.8 snaps to icon-anchor 'bottom' (1.0), offset corrects the gap
    expect(store.write).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({ symbolIconAnchor: 'bottom', symbolIconOffset: [0, 8.8] })
    }))
  })

  it('respects a custom symbolViewBox when computing the offset', async () => {
    const map = createMap()
    const mapProvider = createMapProvider()
    const properties = { symbol: 'pin', symbolViewBox: '0 0 100 100' }
    const store = createStore([point('p1', properties)])

    await resolvePointSymbol({ store, mapProvider, map, featureId: 'p1', properties })

    // pin's anchor [0.5, 0.9] against a 100×100 viewBox instead of the built-in 44×44
    expect(store.write).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({ symbolIconOffset: [0, 10] })
    }))
  })

  it('surfaces (rather than swallows) a registration failure', async () => {
    const map = createMap()
    const properties = { symbol: 'pin' }
    const mapProvider = { addSymbolsToMap: jest.fn(() => Promise.reject(new Error('rasterise failed'))) }
    const store = createStore([point('p1', properties)])
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    await resolvePointSymbol({ store, mapProvider, map, featureId: 'p1', properties })

    expect(store.write).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith('[draw] failed to resolve point symbol', 'p1', expect.any(Error))
    consoleError.mockRestore()
  })
})

describe('refreshAllPointSymbols', () => {
  it('re-resolves every point feature with a symbol config, ignoring non-point and unstyled features', async () => {
    const map = createMap()
    const mapProvider = createMapProvider()
    const pointWithSymbol = { id: 'p1', geometry: { type: 'Point' }, properties: { symbol: 'pin' } }
    const pointWithoutSymbol = { id: 'p2', geometry: { type: 'Point' }, properties: {} }
    const polygon = { id: 'poly1', geometry: { type: 'Polygon' }, properties: { symbol: 'pin' } }
    const store = createStore([pointWithSymbol, pointWithoutSymbol, polygon])

    await refreshAllPointSymbols({ store, mapProvider, map })

    expect(mapProvider.addSymbolsToMap).toHaveBeenCalledTimes(1)
    expect(mapProvider.addSymbolsToMap).toHaveBeenCalledWith([pointWithSymbol.properties], mapStyle, symbolRegistry)
  })

  it('does nothing when there are no drawn points', async () => {
    const map = createMap()
    const mapProvider = createMapProvider()
    const store = createStore([])
    await refreshAllPointSymbols({ store, mapProvider, map })
    expect(mapProvider.addSymbolsToMap).not.toHaveBeenCalled()
  })
})
