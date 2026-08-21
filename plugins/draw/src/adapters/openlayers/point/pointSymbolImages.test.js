import { hasSymbolStyle, getPixelRatio, resolvePointSymbol, refreshAllPointSymbols } from './pointSymbolImages.js'
import { symbolRegistry } from '../../../../../../src/services/symbolRegistry.js'
import { getCachedSymbolImage, clearSymbolImageCache } from '../../../../../../providers/beta/openlayers/src/utils/symbolImages.js'

const mapStyle = { id: 'outdoor', mapColorScheme: 'light' }

const createMapProvider = ({ drawScale = 1 } = {}) => ({ drawScale })

// A minimal ol.Feature stand-in — resolvePointSymbol only ever calls
// getProperties()/set() on it, and manager.store.source.hasFeature() to check liveness.
const createOlFeature = (properties) => {
  const props = { ...properties }
  return {
    getProperties: () => props,
    set: jest.fn((key, value) => { props[key] = value })
  }
}

const createManager = ({ features = [] } = {}) => ({
  mapStyle,
  store: {
    source: {
      hasFeature: jest.fn((f) => features.includes(f)),
      getFeatures: jest.fn(() => features)
    }
  }
})

// symbolRegistry.rasteriseSymbolImage() draws an SVG through a real `new Image()`/onload
// round-trip that jsdom never resolves — every other test file touching it (e.g. the
// MapLibre adapter's pointSymbolImages.test.js) instead lets a mocked provider call
// (addSymbolsToMap) stand in for it. This adapter calls rasteriseSymbolImage directly (it
// *is* the last-mile pipeline, with no provider-level call to mock instead), so it's stubbed
// here with a fake resolved ImageData keyed to the properties/pixelRatio, matching
// getSymbolImageId's own id shape closely enough for assertions to key off it.
const stubRasterise = () => jest.spyOn(symbolRegistry, 'rasteriseSymbolImage')
  .mockImplementation(async (style, ms, variant, pixelRatio) => ({
    // variant folded into the id (mirroring the real act-/sel- prefixing) so normal/active/
    // selected resolve to distinct ids, the way real symbol configs do.
    imageId: `${variant}-${symbolRegistry.getSymbolImageId(style, ms, false, pixelRatio)}`,
    imageData: { width: 10, height: 10 }
  }))

beforeEach(() => {
  clearSymbolImageCache()
  HTMLCanvasElement.prototype.getContext = jest.fn(function () {
    this._ctx ??= { putImageData: jest.fn() }
    return this._ctx
  })
  stubRasterise()
})

afterEach(() => jest.restoreAllMocks())

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
  it('combines devicePixelRatio and mapProvider.drawScale', () => {
    const restore = globalThis.devicePixelRatio
    globalThis.devicePixelRatio = 2
    expect(getPixelRatio(createMapProvider({ drawScale: 1.5 }))).toBe(3)
    globalThis.devicePixelRatio = restore
  })

  it('falls back to 1 for either factor when unset', () => {
    const restore = globalThis.devicePixelRatio
    delete globalThis.devicePixelRatio
    expect(getPixelRatio(createMapProvider({ drawScale: undefined }))).toBe(1)
    expect(getPixelRatio(undefined)).toBe(1)
    globalThis.devicePixelRatio = restore
  })
})

describe('resolvePointSymbol', () => {
  it('does nothing for a feature with no symbol config', async () => {
    const olFeature = createOlFeature({})
    const manager = createManager()
    await resolvePointSymbol({ manager, mapProvider: createMapProvider(), olFeature })
    expect(olFeature.set).not.toHaveBeenCalled()
  })

  it('rasterises, caches the canvas and writes symbolImageId/symbolPixelRatio back onto the feature', async () => {
    const properties = { symbol: 'pin' }
    const olFeature = createOlFeature(properties)
    const manager = createManager({ features: [olFeature] })
    const mapProvider = createMapProvider({ drawScale: 2 })

    await resolvePointSymbol({ manager, mapProvider, olFeature })

    const pixelRatio = getPixelRatio(mapProvider)
    const baseId = symbolRegistry.getSymbolImageId(properties, mapStyle, false, pixelRatio)
    expect(olFeature.set).toHaveBeenCalledWith('symbolImageId', `normal-${baseId}`)
    // symbolPixelRatio is what core/styles.js later uses to scale the (pixelRatio×-oversized)
    // cached canvas back down to its intended CSS display size.
    expect(olFeature.set).toHaveBeenCalledWith('symbolPixelRatio', pixelRatio)
    expect(getCachedSymbolImage(`normal-${baseId}`)).toBeInstanceOf(HTMLCanvasElement)
  })

  it('also rasterises, caches and writes the active/selected variants — one image id each, keyed to the same symbol config', async () => {
    const properties = { symbol: 'pin' }
    const olFeature = createOlFeature(properties)
    const manager = createManager({ features: [olFeature] })
    const mapProvider = createMapProvider()

    await resolvePointSymbol({ manager, mapProvider, olFeature })

    const pixelRatio = getPixelRatio(mapProvider)
    const baseId = symbolRegistry.getSymbolImageId(properties, mapStyle, false, pixelRatio)
    expect(olFeature.set).toHaveBeenCalledWith('symbolActiveImageId', `active-${baseId}`)
    expect(olFeature.set).toHaveBeenCalledWith('symbolSelectedImageId', `selected-${baseId}`)
    expect(getCachedSymbolImage(`active-${baseId}`)).toBeInstanceOf(HTMLCanvasElement)
    expect(getCachedSymbolImage(`selected-${baseId}`)).toBeInstanceOf(HTMLCanvasElement)
    // objectContaining, not the exact `properties` object — resolvePointSymbol's own
    // property-write calls mutate that same (by-reference) object in place afterwards, and
    // jest's mock.calls records the reference, not a snapshot at call time.
    const symbolMatch = expect.objectContaining({ symbol: 'pin' })
    expect(symbolRegistry.rasteriseSymbolImage).toHaveBeenCalledWith(symbolMatch, mapStyle, 'normal', pixelRatio)
    expect(symbolRegistry.rasteriseSymbolImage).toHaveBeenCalledWith(symbolMatch, mapStyle, 'active', pixelRatio)
    expect(symbolRegistry.rasteriseSymbolImage).toHaveBeenCalledWith(symbolMatch, mapStyle, 'selected', pixelRatio)
  })

  it('skips just the active/selected properties if only those variants resolve null (normal still succeeds)', async () => {
    const properties = { symbol: 'pin' }
    const olFeature = createOlFeature(properties)
    const manager = createManager({ features: [olFeature] })
    symbolRegistry.rasteriseSymbolImage
      .mockImplementationOnce(async (style, ms, variant, pixelRatio) => // normal — real stub behaviour
        ({ imageId: `${variant}-${symbolRegistry.getSymbolImageId(style, ms, false, pixelRatio)}`, imageData: { width: 10, height: 10 } }))
      .mockResolvedValueOnce(null) // active
      .mockResolvedValueOnce(null) // selected

    await resolvePointSymbol({ manager, mapProvider: createMapProvider(), olFeature })

    expect(olFeature.set).toHaveBeenCalledWith('symbolImageId', expect.any(String))
    expect(olFeature.set).not.toHaveBeenCalledWith('symbolActiveImageId', expect.anything())
    expect(olFeature.set).not.toHaveBeenCalledWith('symbolSelectedImageId', expect.anything())
  })

  it('does nothing when rasterisation resolves null (e.g. an unresolvable symbol id)', async () => {
    const properties = { symbol: 'not-a-real-symbol' }
    const olFeature = createOlFeature(properties)
    const manager = createManager({ features: [olFeature] })
    symbolRegistry.rasteriseSymbolImage.mockResolvedValueOnce(null)

    await resolvePointSymbol({ manager, mapProvider: createMapProvider(), olFeature })

    expect(olFeature.set).not.toHaveBeenCalled()
  })

  it('does not write back if the feature was removed from the source while rasterising was in flight', async () => {
    const properties = { symbol: 'pin' }
    const olFeature = createOlFeature(properties)
    const manager = createManager({ features: [] }) // not present in the source

    await resolvePointSymbol({ manager, mapProvider: createMapProvider(), olFeature })

    expect(olFeature.set).not.toHaveBeenCalled()
  })

  it('surfaces (rather than swallows) a rasterisation failure', async () => {
    const properties = { symbol: 'pin' }
    const olFeature = createOlFeature(properties)
    olFeature.getId = () => 'p1'
    const manager = createManager({ features: [olFeature] })
    const error = new Error('rasterise failed')
    symbolRegistry.rasteriseSymbolImage.mockRejectedValueOnce(error)
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    await resolvePointSymbol({ manager, mapProvider: createMapProvider(), olFeature })

    expect(olFeature.set).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith('[draw] failed to resolve point symbol', 'p1', error)
  })
})

describe('refreshAllPointSymbols', () => {
  const feature = (getType, properties) => {
    const f = createOlFeature(properties)
    f.getGeometry = () => ({ getType: () => getType })
    return f
  }

  it('re-resolves every point feature with a symbol config, ignoring non-point and unstyled features', async () => {
    const pointWithSymbol = feature('Point', { symbol: 'pin' })
    const pointWithoutSymbol = feature('Point', {})
    const polygon = feature('Polygon', { symbol: 'pin' })
    const manager = createManager({ features: [pointWithSymbol, pointWithoutSymbol, polygon] })
    manager.store.source.hasFeature = jest.fn(() => true)

    await refreshAllPointSymbols({ manager, mapProvider: createMapProvider() })

    expect(pointWithSymbol.set).toHaveBeenCalledWith('symbolImageId', expect.any(String))
    expect(pointWithoutSymbol.set).not.toHaveBeenCalled()
    expect(polygon.set).not.toHaveBeenCalled()
  })

  it('does nothing when there are no drawn points', async () => {
    const manager = createManager({ features: [] })
    await expect(refreshAllPointSymbols({ manager, mapProvider: createMapProvider() })).resolves.toEqual([])
  })
})
