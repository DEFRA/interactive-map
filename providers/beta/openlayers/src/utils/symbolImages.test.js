import { getCachedSymbolImage, getOrCreateSymbolImage, clearSymbolImageCache, registerSymbol, registerSymbols, getCachedSymbolDataUri, getActiveSymbolImageId, getSelectedSymbolImageId } from './symbolImages.js'

const MAP_STYLE = { id: 'outdoor' }

const imageData = (width, height) => ({ width, height })

const makeSymbolRegistry = () => ({
  getSymbolImageId: jest.fn((style, mapStyle, active, pixelRatio) => `symbol-${style.symbol}-${pixelRatio}x${active ? '-active' : ''}`),
  rasteriseSymbolImage: jest.fn(async (style, mapStyle, variant, pixelRatio) => ({
    imageId: `symbol-${style.symbol}-${pixelRatio}x${variant === 'active' ? '-active' : variant === 'selected' ? '-selected' : ''}`,
    imageData: imageData(20, 20)
  }))
})

beforeEach(() => {
  clearSymbolImageCache()
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

describe('getCachedSymbolImage', () => {
  it('returns undefined for an id that has never been registered', () => {
    expect(getCachedSymbolImage('symbol-unseen')).toBeUndefined()
  })

  it('returns the cached canvas after getOrCreateSymbolImage has resolved it', () => {
    const canvas = getOrCreateSymbolImage('symbol-a', imageData(20, 30))
    expect(getCachedSymbolImage('symbol-a')).toBe(canvas)
  })
})

describe('getOrCreateSymbolImage', () => {
  it('draws the ImageData onto a canvas sized to match it', () => {
    const canvas = getOrCreateSymbolImage('symbol-b', imageData(44, 60))
    expect(canvas).toBeInstanceOf(HTMLCanvasElement)
    expect(canvas.width).toBe(44)
    expect(canvas.height).toBe(60)
    expect(canvas.getContext().putImageData).toHaveBeenCalledWith(imageData(44, 60), 0, 0)
  })

  it('rasterises only once — a second call with the same id returns the same canvas without redrawing', () => {
    const first = getOrCreateSymbolImage('symbol-c', imageData(10, 10))
    const contextCallsAfterFirst = HTMLCanvasElement.prototype.getContext.mock.calls.length
    const second = getOrCreateSymbolImage('symbol-c', imageData(10, 10))
    expect(second).toBe(first)
    expect(HTMLCanvasElement.prototype.getContext.mock.calls).toHaveLength(contextCallsAfterFirst)
  })

  it('different ids get independent canvases', () => {
    const a = getOrCreateSymbolImage('symbol-d', imageData(10, 10))
    const b = getOrCreateSymbolImage('symbol-e', imageData(20, 20))
    expect(a).not.toBe(b)
  })
})

describe('clearSymbolImageCache', () => {
  it('forces the next getOrCreateSymbolImage call to rasterise again', () => {
    const first = getOrCreateSymbolImage('symbol-f', imageData(10, 10))
    clearSymbolImageCache()
    const second = getOrCreateSymbolImage('symbol-f', imageData(10, 10))
    expect(second).not.toBe(first)
  })

  it('also clears the data URI cache', async () => {
    const symbolRegistry = makeSymbolRegistry()
    await registerSymbol({ symbol: 'pin' }, MAP_STYLE, symbolRegistry, 1)
    clearSymbolImageCache()
    expect(getCachedSymbolDataUri('symbol-pin-1x')).toBeUndefined()
  })
})

describe('registerSymbol', () => {
  it('caches a data URI built from the rasterised ImageData', async () => {
    const symbolRegistry = makeSymbolRegistry()
    await registerSymbol({ symbol: 'pin' }, MAP_STYLE, symbolRegistry, 1)
    expect(getCachedSymbolDataUri('symbol-pin-1x')).toBe('data:image/png;base64,mock-20x20')
  })

  it('rasterises at the given pixelRatio, not a fixed constant', async () => {
    const symbolRegistry = makeSymbolRegistry()
    await registerSymbol({ symbol: 'pin' }, MAP_STYLE, symbolRegistry, 3)
    expect(symbolRegistry.rasteriseSymbolImage).toHaveBeenCalledWith({ symbol: 'pin' }, MAP_STYLE, 'normal', 3)
  })

  it('does nothing when rasteriseSymbolImage returns null', async () => {
    const symbolRegistry = { ...makeSymbolRegistry(), rasteriseSymbolImage: jest.fn().mockResolvedValue(null) }
    await registerSymbol({ symbol: 'unknown' }, MAP_STYLE, symbolRegistry, 1)
    expect(getCachedSymbolDataUri('symbol-unknown-1x')).toBeUndefined()
  })

  it('does nothing when getSymbolImageId returns null', async () => {
    const symbolRegistry = { ...makeSymbolRegistry(), getSymbolImageId: jest.fn(() => null) }
    await registerSymbol({ symbol: 'unknown' }, MAP_STYLE, symbolRegistry, 1)
    expect(symbolRegistry.rasteriseSymbolImage).not.toHaveBeenCalled()
  })

  it('skips re-rasterising normal/active once cached for the same imageId — selected always re-rasterises', async () => {
    const symbolRegistry = makeSymbolRegistry()
    await registerSymbol({ symbol: 'pin' }, MAP_STYLE, symbolRegistry, 1)
    expect(symbolRegistry.rasteriseSymbolImage).toHaveBeenCalledTimes(3) // normal + active + selected
    await registerSymbol({ symbol: 'pin' }, MAP_STYLE, symbolRegistry, 1)
    expect(symbolRegistry.rasteriseSymbolImage).toHaveBeenCalledTimes(4) // + selected only
  })

  it('reuses the same cached canvas getOrCreateSymbolImage builds', async () => {
    const symbolRegistry = makeSymbolRegistry()
    await registerSymbol({ symbol: 'pin' }, MAP_STYLE, symbolRegistry, 1)
    expect(getCachedSymbolImage('symbol-pin-1x')).toBeInstanceOf(HTMLCanvasElement)
  })

  it('registers the active variant, resolvable via getActiveSymbolImageId', async () => {
    const symbolRegistry = makeSymbolRegistry()
    await registerSymbol({ symbol: 'pin' }, MAP_STYLE, symbolRegistry, 1)
    expect(getActiveSymbolImageId('symbol-pin-1x')).toBe('symbol-pin-1x-active')
    expect(getCachedSymbolImage('symbol-pin-1x-active')).toBeInstanceOf(HTMLCanvasElement)
  })

  it('registers the selected variant, resolvable via getSelectedSymbolImageId', async () => {
    const symbolRegistry = makeSymbolRegistry()
    await registerSymbol({ symbol: 'pin' }, MAP_STYLE, symbolRegistry, 1)
    expect(getSelectedSymbolImageId('symbol-pin-1x')).toBe('symbol-pin-1x-selected')
    expect(getCachedSymbolImage('symbol-pin-1x-selected')).toBeInstanceOf(HTMLCanvasElement)
  })

  it('does not register an active variant when getSymbolImageId returns null for active', async () => {
    const symbolRegistry = makeSymbolRegistry()
    symbolRegistry.getSymbolImageId.mockImplementation((style, mapStyle, active) => (active ? null : 'symbol-pin-1x'))
    await registerSymbol({ symbol: 'pin' }, MAP_STYLE, symbolRegistry, 1)
    expect(getActiveSymbolImageId('symbol-pin-1x')).toBeNull()
  })
})

describe('getActiveSymbolImageId / getSelectedSymbolImageId', () => {
  it('returns null for an imageId that has never been registered', () => {
    expect(getActiveSymbolImageId('symbol-unseen')).toBeNull()
    expect(getSelectedSymbolImageId('symbol-unseen')).toBeNull()
  })

  it('is cleared by clearSymbolImageCache', async () => {
    const symbolRegistry = makeSymbolRegistry()
    await registerSymbol({ symbol: 'pin' }, MAP_STYLE, symbolRegistry, 1)
    clearSymbolImageCache()
    expect(getActiveSymbolImageId('symbol-pin-1x')).toBeNull()
    expect(getSelectedSymbolImageId('symbol-pin-1x')).toBeNull()
  })
})

describe('registerSymbols', () => {
  it('registers every config in parallel', async () => {
    const symbolRegistry = makeSymbolRegistry()
    await registerSymbols([{ symbol: 'pin' }, { symbol: 'flag' }], MAP_STYLE, symbolRegistry, 1)
    expect(symbolRegistry.rasteriseSymbolImage).toHaveBeenCalledTimes(6) // 2 symbols × normal/active/selected
  })

  it('is a no-op for an empty array', async () => {
    const symbolRegistry = makeSymbolRegistry()
    await registerSymbols([], MAP_STYLE, symbolRegistry, 1)
    expect(symbolRegistry.rasteriseSymbolImage).not.toHaveBeenCalled()
  })
})
