import Icon from 'ol/style/Icon.js'
import ImageState from 'ol/ImageState.js'
import { SymbolImageCache } from './symbolImages.js'

const MAP_STYLE = { id: 'outdoor' }

const imageData = (width, height) => ({ width, height })

const makeSymbolRegistry = () => ({
  getSymbolImageId: jest.fn((style, mapStyle, active, pixelRatio) => `symbol-${style.symbol}-${pixelRatio}x${active ? '-active' : ''}`),
  rasteriseSymbolImage: jest.fn(async (style, mapStyle, variant, pixelRatio) => ({
    imageId: `symbol-${style.symbol}-${pixelRatio}x${variant === 'active' ? '-active' : variant === 'selected' ? '-selected' : ''}`,
    imageData: imageData(20, 20)
  }))
})

let cache

beforeEach(() => {
  cache = new SymbolImageCache()
  // Memoized per-canvas so `canvas.getContext()` returns the same mock object on repeat
  // calls (real canvases do the same) — needed so assertions and the code under test see
  // the same putImageData spy, not two different ones from two different mock calls.
  HTMLCanvasElement.prototype.getContext = jest.fn(function () {
    this._ctx ??= { putImageData: jest.fn() }
    return this._ctx
  })
  HTMLCanvasElement.prototype.toDataURL = jest.fn(function () {
    return `data:image/png;base64,mock-${this.width}x${this.height}`
  })
})

describe('getImage', () => {
  it('returns undefined for an id that has never been registered', () => {
    expect(cache.getImage('symbol-unseen')).toBeUndefined()
  })

  it('returns the canvas addImage drew', () => {
    cache.addImage('symbol-a', imageData(20, 30))
    expect(cache.getImage('symbol-a')).toBeInstanceOf(HTMLCanvasElement)
  })
})

describe('addImage', () => {
  it('draws the ImageData onto a canvas sized to match it', () => {
    cache.addImage('symbol-b', imageData(44, 60))
    const canvas = cache.getImage('symbol-b')
    expect(canvas.width).toBe(44)
    expect(canvas.height).toBe(60)
    expect(canvas.getContext().putImageData).toHaveBeenCalledWith(imageData(44, 60), 0, 0)
  })

  it('only makes a data URI when asked', () => {
    cache.addImage('symbol-plain', imageData(10, 10))
    cache.addImage('symbol-uri', imageData(12, 12), true)
    expect(cache.getDataUri('symbol-plain')).toBeUndefined()
    expect(cache.getDataUri('symbol-uri')).toBe('data:image/png;base64,mock-12x12')
  })
})

// Each OL provider owns its own cache, so two maps never share (or clobber) each other's images
it('keeps separate caches independent', async () => {
  const other = new SymbolImageCache()
  await cache.registerSymbol({ symbol: 'pin' }, MAP_STYLE, makeSymbolRegistry(), 1)
  expect(cache.getImage('symbol-pin-1x')).toBeInstanceOf(HTMLCanvasElement)
  expect(other.getImage('symbol-pin-1x')).toBeUndefined()
  expect(other.getActiveImageId('symbol-pin-1x')).toBeNull()
})

describe('registerSymbol', () => {
  // A flat style's icon-src that isn't already in OL's icon cache is loaded asynchronously, and
  // OL draws nothing for the icon until it has — a flicker every time styles switch images.
  it('seeds OL\'s icon cache, so an icon-src from it is loaded straight away', async () => {
    const symbolRegistry = makeSymbolRegistry()
    symbolRegistry.getSymbolImageId.mockReturnValue('seeded')
    symbolRegistry.rasteriseSymbolImage.mockImplementation(async (style, mapStyle, variant) => ({
      imageId: variant === 'normal' ? 'seeded' : `seeded-${variant}`,
      imageData: imageData(31, 17)
    }))
    await cache.registerSymbol({ symbol: 'pin' }, MAP_STYLE, symbolRegistry, 1)

    const icon = new Icon({ src: cache.getDataUri('seeded') })
    expect(icon.getImageState()).toBe(ImageState.LOADED)
    expect(icon.getImage(1)).toBe(cache.getImage('seeded'))
  })

  it('caches a data URI for the normal image only', async () => {
    await cache.registerSymbol({ symbol: 'pin' }, MAP_STYLE, makeSymbolRegistry(), 1)
    expect(cache.getDataUri('symbol-pin-1x')).toBe('data:image/png;base64,mock-20x20')
    expect(cache.getDataUri('symbol-pin-1x-active')).toBeUndefined()
  })

  it('rasterises at the given pixelRatio', async () => {
    const symbolRegistry = makeSymbolRegistry()
    await cache.registerSymbol({ symbol: 'pin' }, MAP_STYLE, symbolRegistry, 3)
    expect(symbolRegistry.rasteriseSymbolImage).toHaveBeenCalledWith({ symbol: 'pin' }, MAP_STYLE, 'normal', 3)
  })

  it('does nothing when rasteriseSymbolImage returns null', async () => {
    const symbolRegistry = { ...makeSymbolRegistry(), rasteriseSymbolImage: jest.fn().mockResolvedValue(null) }
    await cache.registerSymbol({ symbol: 'unknown' }, MAP_STYLE, symbolRegistry, 1)
    expect(cache.getDataUri('symbol-unknown-1x')).toBeUndefined()
  })

  it('does nothing when getSymbolImageId returns null', async () => {
    const symbolRegistry = { ...makeSymbolRegistry(), getSymbolImageId: jest.fn(() => null) }
    await cache.registerSymbol({ symbol: 'unknown' }, MAP_STYLE, symbolRegistry, 1)
    expect(symbolRegistry.rasteriseSymbolImage).not.toHaveBeenCalled()
  })

  it('skips re-rasterising normal/active once cached — selected re-resolves its id but isn\'t redrawn', async () => {
    const symbolRegistry = makeSymbolRegistry()
    await cache.registerSymbol({ symbol: 'pin' }, MAP_STYLE, symbolRegistry, 1)
    expect(symbolRegistry.rasteriseSymbolImage).toHaveBeenCalledTimes(3) // normal + active + selected
    const selected = cache.getImage('symbol-pin-1x-selected')
    await cache.registerSymbol({ symbol: 'pin' }, MAP_STYLE, symbolRegistry, 1)
    expect(symbolRegistry.rasteriseSymbolImage).toHaveBeenCalledTimes(4) // + selected only
    expect(cache.getImage('symbol-pin-1x-selected')).toBe(selected)
  })

  it('maps the normal image to its active and selected variants', async () => {
    await cache.registerSymbol({ symbol: 'pin' }, MAP_STYLE, makeSymbolRegistry(), 1)
    expect(cache.getActiveImageId('symbol-pin-1x')).toBe('symbol-pin-1x-active')
    expect(cache.getSelectedImageId('symbol-pin-1x')).toBe('symbol-pin-1x-selected')
    expect(cache.getImage('symbol-pin-1x-active')).toBeInstanceOf(HTMLCanvasElement)
    expect(cache.getImage('symbol-pin-1x-selected')).toBeInstanceOf(HTMLCanvasElement)
  })

  it('has no active variant when getSymbolImageId returns null for active', async () => {
    const symbolRegistry = makeSymbolRegistry()
    symbolRegistry.getSymbolImageId.mockImplementation((style, mapStyle, active) => (active ? null : 'symbol-pin-1x'))
    await cache.registerSymbol({ symbol: 'pin' }, MAP_STYLE, symbolRegistry, 1)
    expect(cache.getActiveImageId('symbol-pin-1x')).toBeNull()
  })
})

describe('getActiveImageId / getSelectedImageId', () => {
  it('returns null for an imageId that has never been registered', () => {
    expect(cache.getActiveImageId('symbol-unseen')).toBeNull()
    expect(cache.getSelectedImageId('symbol-unseen')).toBeNull()
  })
})

describe('registerSymbols', () => {
  it('registers every config in parallel', async () => {
    const symbolRegistry = makeSymbolRegistry()
    await cache.registerSymbols([{ symbol: 'pin' }, { symbol: 'flag' }], MAP_STYLE, symbolRegistry, 1)
    expect(symbolRegistry.rasteriseSymbolImage).toHaveBeenCalledTimes(6) // 2 symbols × normal/active/selected
  })

  it('is a no-op for an empty array', async () => {
    const symbolRegistry = makeSymbolRegistry()
    await cache.registerSymbols([], MAP_STYLE, symbolRegistry, 1)
    expect(symbolRegistry.rasteriseSymbolImage).not.toHaveBeenCalled()
  })
})
