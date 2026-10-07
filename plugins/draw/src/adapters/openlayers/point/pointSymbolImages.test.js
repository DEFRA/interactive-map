import { hasSymbolStyle, getPixelRatio, resolvePointSymbol, refreshAllPointSymbols } from './pointSymbolImages.js'
import { createSymbolRegistry } from '../../../../../../src/services/symbolRegistry.js'
import { SymbolImageCache } from '../../../../../../providers/beta/openlayers/src/utils/symbolImages.js'

const symbolRegistry = createSymbolRegistry()

const mapStyle = { id: 'outdoor', mapColorScheme: 'light' }

// The OL provider's symbol image methods, backed by a real cache
const createMapProvider = ({ pixelRatio = 1 } = {}) => {
  const symbolImages = new SymbolImageCache()
  return {
    map: { getPixelRatio: () => pixelRatio },
    symbolImages,
    addSymbolsToMap: jest.fn((configs, ms, registry, ratio) => symbolImages.registerSymbols(configs, ms, registry, ratio)),
    getActiveSymbolImageId: (imageId) => symbolImages.getActiveImageId(imageId),
    getSelectedSymbolImageId: (imageId) => symbolImages.getSelectedImageId(imageId)
  }
}

// A minimal ol.Feature stand-in — resolvePointSymbol only ever calls getProperties()/
// setProperties() on it, and manager.store.source.hasFeature() to check liveness.
const createOlFeature = (properties) => {
  const props = { ...properties }
  return {
    getProperties: () => props,
    setProperties: jest.fn((values) => { Object.assign(props, values) })
  }
}

const createManager = ({ features = [] } = {}) => ({
  mapStyle,
  symbolRegistry,
  store: {
    source: {
      hasFeature: jest.fn((f) => features.includes(f)),
      getFeatures: jest.fn(() => features)
    }
  }
})

// symbolRegistry.rasteriseSymbolImage() draws an SVG through a real `new Image()`/onload
// round-trip that jsdom never resolves, so it's stubbed with a fake ImageData under the ids the
// real one would give.
const stubRasterise = () => jest.spyOn(symbolRegistry, 'rasteriseSymbolImage')
  .mockImplementation(async (style, ms, variant, pixelRatio) => {
    const imageId = symbolRegistry.getSymbolImageId(style, ms, variant, pixelRatio)
    return imageId ? { imageId, imageData: { width: 10, height: 10 } } : null
  })

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(function () {
    this._ctx ??= { putImageData: jest.fn() }
    return this._ctx
  })
  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock')
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
  it('reads the map\'s own pixelRatio (device pixel ratio × map-size scale)', () => {
    expect(getPixelRatio(createMapProvider({ pixelRatio: 3 }))).toBe(3)
  })

  it('falls back to 1 when there is no map or no ratio', () => {
    expect(getPixelRatio(undefined)).toBe(1)
    expect(getPixelRatio({ map: {} })).toBe(1)
    expect(getPixelRatio(createMapProvider({ pixelRatio: 0 }))).toBe(1)
  })
})

describe('resolvePointSymbol', () => {
  it('does nothing for a feature with no symbol config', async () => {
    const olFeature = createOlFeature({})
    const mapProvider = createMapProvider()
    await resolvePointSymbol({ manager: createManager(), mapProvider, olFeature })
    expect(mapProvider.addSymbolsToMap).not.toHaveBeenCalled()
    expect(olFeature.setProperties).not.toHaveBeenCalled()
  })

  it('registers the images with the provider at the map\'s pixel ratio, then writes every resolved property in one go', async () => {
    const properties = { symbol: 'pin' }
    const olFeature = createOlFeature(properties)
    const manager = createManager({ features: [olFeature] })
    const mapProvider = createMapProvider({ pixelRatio: 2 })

    await resolvePointSymbol({ manager, mapProvider, olFeature })

    expect(mapProvider.addSymbolsToMap).toHaveBeenCalledWith([expect.objectContaining({ symbol: 'pin' })], mapStyle, symbolRegistry, 2)
    const imageId = symbolRegistry.getSymbolImageId(properties, mapStyle, 'normal', 2)
    expect(olFeature.setProperties).toHaveBeenCalledTimes(1)
    expect(olFeature.setProperties).toHaveBeenCalledWith({
      symbolImageId: imageId,
      symbolActiveImageId: symbolRegistry.getSymbolImageId(properties, mapStyle, 'active', 2),
      symbolSelectedImageId: symbolRegistry.getSymbolImageId(properties, mapStyle, 'selected', 2),
      symbolImageAnchor: symbolRegistry.getSymbolDef(properties).anchor,
      // core/styles.js scales the (pixelRatio×-oversized) canvas back down by this
      symbolPixelRatio: 2
    })
    expect(mapProvider.symbolImages.getImage(imageId)).toBeInstanceOf(HTMLCanvasElement)
  })

  it('resolves a symbolAnchor override to the shape, as the anchor every style uses', async () => {
    const properties = { symbol: 'circle', symbolAnchor: [0.5, 1] }
    const olFeature = createOlFeature(properties)

    await resolvePointSymbol({ manager: createManager({ features: [olFeature] }), mapProvider: createMapProvider(), olFeature })

    expect(olFeature.getProperties().symbolImageAnchor).toEqual(symbolRegistry.getSymbolDef(properties).anchor)
  })

  it('does nothing for an unresolvable symbol id', async () => {
    const olFeature = createOlFeature({ symbol: 'not-a-real-symbol' })

    await resolvePointSymbol({ manager: createManager({ features: [olFeature] }), mapProvider: createMapProvider(), olFeature })

    expect(olFeature.setProperties).not.toHaveBeenCalled()
  })

  it('does not write back if the feature was removed from the source while registering', async () => {
    const olFeature = createOlFeature({ symbol: 'pin' })

    await resolvePointSymbol({ manager: createManager({ features: [] }), mapProvider: createMapProvider(), olFeature })

    expect(olFeature.setProperties).not.toHaveBeenCalled()
  })

  it('rejects, without writing to the feature, when registration fails', async () => {
    const olFeature = createOlFeature({ symbol: 'pin' })
    const mapProvider = createMapProvider()
    const error = new Error('rasterise failed')
    mapProvider.addSymbolsToMap.mockRejectedValueOnce(error)

    await expect(resolvePointSymbol({ manager: createManager({ features: [olFeature] }), mapProvider, olFeature })).rejects.toBe(error)
    expect(olFeature.setProperties).not.toHaveBeenCalled()
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

    expect(pointWithSymbol.setProperties).toHaveBeenCalledWith(expect.objectContaining({ symbolImageId: expect.any(String) }))
    expect(pointWithoutSymbol.setProperties).not.toHaveBeenCalled()
    expect(polygon.setProperties).not.toHaveBeenCalled()
  })

  it('registers at pixelRatioOverride rather than the map\'s current ratio when given', async () => {
    const point = feature('Point', { symbol: 'pin' })
    const manager = createManager({ features: [point] })
    const mapProvider = createMapProvider({ pixelRatio: 2 })

    await refreshAllPointSymbols({ manager, mapProvider, pixelRatioOverride: 4 })

    expect(mapProvider.addSymbolsToMap).toHaveBeenCalledWith(expect.any(Array), mapStyle, symbolRegistry, 4)
    expect(point.setProperties).toHaveBeenCalledWith(expect.objectContaining({ symbolPixelRatio: 4 }))
  })

  it('drops an older refresh\'s results when a newer one has started since', async () => {
    const point = feature('Point', { symbol: 'pin' })
    const manager = createManager({ features: [point] })
    const mapProvider = createMapProvider()
    // the first refresh's registration is held until after the second has finished
    let releaseFirst
    const held = new Promise((resolve) => { releaseFirst = resolve })
    mapProvider.addSymbolsToMap.mockImplementationOnce(() => held)

    const first = refreshAllPointSymbols({ manager, mapProvider, pixelRatioOverride: 1 })
    await refreshAllPointSymbols({ manager, mapProvider, pixelRatioOverride: 2 })
    releaseFirst()
    await first

    expect(point.setProperties).toHaveBeenCalledTimes(1)
    expect(point.setProperties).toHaveBeenCalledWith(expect.objectContaining({ symbolPixelRatio: 2 }))
  })

  it('does nothing when there are no drawn points', async () => {
    const manager = createManager({ features: [] })
    await expect(refreshAllPointSymbols({ manager, mapProvider: createMapProvider() })).resolves.toEqual([])
  })
})
