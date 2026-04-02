import { anchorToMaplibre, getSymbolImageId, registerSymbols } from './symbolImages.js'
import { symbolRegistry } from '../../../../src/services/symbolRegistry.js'

const STYLE_ID = 'test'
const mapStyle = { id: STYLE_ID }

class MockImageData {
  constructor (width, height) {
    this.width = width
    this.height = height
    this.data = new Uint8ClampedArray(width * height * 4)
  }
}

beforeAll(() => {
  global.ImageData = MockImageData
  global.URL.createObjectURL = jest.fn(() => 'blob:mock')
  global.URL.revokeObjectURL = jest.fn()

  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn((_x, _y, w, h) => new MockImageData(w, h))
  }))

  global.Image = class {
    constructor (w, h) {
      this.width = w
      this.height = h
      this._src = ''
    }

    get src () { return this._src }
    set src (val) { this._src = val; this.onload?.() }
  }
})

beforeEach(() => {
  symbolRegistry.setDefaults({})
})

// ─── anchorToMaplibre ─────────────────────────────────────────────────────────

describe('anchorToMaplibre', () => {
  it('returns center for [0.5, 0.5]', () => {
    expect(anchorToMaplibre([0.5, 0.5])).toBe('center')
  })

  it('returns top for [0.5, 0.0]', () => {
    expect(anchorToMaplibre([0.5, 0.0])).toBe('top')
  })

  it('returns bottom for [0.5, 1.0]', () => {
    expect(anchorToMaplibre([0.5, 1.0])).toBe('bottom')
  })

  it('returns left for [0.0, 0.5]', () => {
    expect(anchorToMaplibre([0.0, 0.5])).toBe('left')
  })

  it('returns right for [1.0, 0.5]', () => {
    expect(anchorToMaplibre([1.0, 0.5])).toBe('right')
  })

  it('returns top-left for [0.0, 0.0]', () => {
    expect(anchorToMaplibre([0.0, 0.0])).toBe('top-left')
  })

  it('returns top-right for [1.0, 0.0]', () => {
    expect(anchorToMaplibre([1.0, 0.0])).toBe('top-right')
  })

  it('returns bottom-left for [0.0, 1.0]', () => {
    expect(anchorToMaplibre([0.0, 1.0])).toBe('bottom-left')
  })

  it('returns bottom-right for [1.0, 1.0]', () => {
    expect(anchorToMaplibre([1.0, 1.0])).toBe('bottom-right')
  })

  it('snaps pin anchor [0.5, 0.9] to bottom', () => {
    expect(anchorToMaplibre([0.5, 0.9])).toBe('bottom')
  })

  it('returns center for values in the middle band', () => {
    expect(anchorToMaplibre([0.5, 0.5])).toBe('center')
    expect(anchorToMaplibre([0.26, 0.26])).toBe('center')
    expect(anchorToMaplibre([0.74, 0.74])).toBe('center')
  })

  it('returns top at boundary value 0.25', () => {
    expect(anchorToMaplibre([0.5, 0.25])).toBe('top')
  })

  it('returns bottom at boundary value 0.75', () => {
    expect(anchorToMaplibre([0.5, 0.75])).toBe('bottom')
  })
})

// ─── getSymbolImageId ─────────────────────────────────────────────────────────

describe('getSymbolImageId', () => {
  it('returns null when dataset has no symbol', () => {
    expect(getSymbolImageId({}, mapStyle, symbolRegistry)).toBeNull()
  })

  it('returns null for an unregistered symbol id', () => {
    expect(getSymbolImageId({ symbol: 'does-not-exist' }, mapStyle, symbolRegistry)).toBeNull()
  })

  it('returns a string prefixed symbol- for normal state', () => {
    const id = getSymbolImageId({ symbol: 'pin' }, mapStyle, symbolRegistry)
    expect(typeof id).toBe('string')
    expect(id).toMatch(/^symbol-[a-z0-9]+-\d+(\.\d+)?x$/)
  })

  it('returns a string prefixed symbol-sel- for selected state', () => {
    const id = getSymbolImageId({ symbol: 'pin' }, mapStyle, symbolRegistry, true)
    expect(typeof id).toBe('string')
    expect(id).toMatch(/^symbol-sel-[a-z0-9]+-\d+(\.\d+)?x$/)
  })

  it('normal and selected ids differ for the same dataset', () => {
    const normalId = getSymbolImageId({ symbol: 'pin' }, mapStyle, symbolRegistry, false)
    const selectedId = getSymbolImageId({ symbol: 'pin' }, mapStyle, symbolRegistry, true)
    expect(normalId).not.toBe(selectedId)
  })

  it('same dataset and style always produces the same id', () => {
    const id1 = getSymbolImageId({ symbol: 'pin' }, mapStyle, symbolRegistry)
    const id2 = getSymbolImageId({ symbol: 'pin' }, mapStyle, symbolRegistry)
    expect(id1).toBe(id2)
  })

  it('different symbols produce different ids', () => {
    const pinId = getSymbolImageId({ symbol: 'pin' }, mapStyle, symbolRegistry)
    const circleId = getSymbolImageId({ symbol: 'circle' }, mapStyle, symbolRegistry)
    expect(pinId).not.toBe(circleId)
  })

  it('different backgrounds produce different ids', () => {
    const redId = getSymbolImageId({ symbol: 'pin', symbolBackgroundColor: '#ff0000' }, mapStyle, symbolRegistry)
    const blueId = getSymbolImageId({ symbol: 'pin', symbolBackgroundColor: '#0000ff' }, mapStyle, symbolRegistry)
    expect(redId).not.toBe(blueId)
  })

  it('resolves inline symbolSvgContent', () => {
    const dataset = {
      symbolSvgContent: '<circle cx="19" cy="19" r="12" fill="{{backgroundColor}}"/>',
      symbolViewBox: '0 0 38 38',
      symbolAnchor: [0.5, 0.5]
    }
    const id = getSymbolImageId(dataset, mapStyle, symbolRegistry)
    expect(id).toMatch(/^symbol-[a-z0-9]+-\d+(\.\d+)?x$/)
  })
})

// ─── registerSymbols ──────────────────────────────────────────────────────────

const makeMap = (existingIds = []) => ({
  _symbolImageMap: {},
  hasImage: jest.fn((id) => existingIds.includes(id)),
  addImage: jest.fn()
})

describe('registerSymbols', () => {
  it('returns early and does not touch map for empty configs', async () => {
    const map = makeMap()
    await registerSymbols(map, [], mapStyle, symbolRegistry)
    expect(map.hasImage).not.toHaveBeenCalled()
    expect(map.addImage).not.toHaveBeenCalled()
  })

  it('resets _symbolImageMap before processing', async () => {
    const map = makeMap()
    map._symbolImageMap = { stale: 'entry' }
    await registerSymbols(map, [{ symbol: 'pin' }], mapStyle, symbolRegistry)
    expect(map._symbolImageMap).not.toHaveProperty('stale')
  })

  it('calls addImage for normal and selected variants', async () => {
    const map = makeMap()
    await registerSymbols(map, [{ symbol: 'pin' }], mapStyle, symbolRegistry)
    expect(map.addImage).toHaveBeenCalledTimes(2)
    expect(map.addImage).toHaveBeenCalledWith(expect.stringMatching(/^symbol-[a-z0-9]+-\d+(\.\d+)?x$/), expect.any(MockImageData), { pixelRatio: 2 })
    expect(map.addImage).toHaveBeenCalledWith(expect.stringMatching(/^symbol-sel-[a-z0-9]+-\d+(\.\d+)?x$/), expect.any(MockImageData), { pixelRatio: 2 })
  })

  it('populates _symbolImageMap with normal → selected id pairs', async () => {
    const map = makeMap()
    await registerSymbols(map, [{ symbol: 'pin' }], mapStyle, symbolRegistry)
    const normalId = getSymbolImageId({ symbol: 'pin' }, mapStyle, symbolRegistry, false)
    const selectedId = getSymbolImageId({ symbol: 'pin' }, mapStyle, symbolRegistry, true)
    expect(map._symbolImageMap[normalId]).toBe(selectedId)
  })

  it('skips addImage when image is already registered', async () => {
    const normalId = getSymbolImageId({ symbol: 'circle' }, mapStyle, symbolRegistry, false)
    const selectedId = getSymbolImageId({ symbol: 'circle' }, mapStyle, symbolRegistry, true)
    const map = makeMap([normalId, selectedId])
    await registerSymbols(map, [{ symbol: 'circle' }], mapStyle, symbolRegistry)
    expect(map.addImage).not.toHaveBeenCalled()
  })

  it('does not call addImage when rasteriseSymbolImage returns null', async () => {
    // getSymbolImageId (called twice — normal + selected) needs a real symbolDef to produce imageIds,
    // but rasteriseSymbolImage must get undefined from getSymbolDef so it returns null.
    // The registry.get call order: [1] getSymbolImageId normal, [2] getSymbolImageId selected,
    // [3] rasteriseSymbolImage normal, [4] rasteriseSymbolImage selected.
    const pinDef = symbolRegistry.get('pin')
    const getSpy = jest.spyOn(symbolRegistry, 'get')
      .mockReturnValueOnce(pinDef)
      .mockReturnValueOnce(pinDef)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined)
    const map = makeMap()
    await registerSymbols(map, [{ symbol: 'pin' }], mapStyle, symbolRegistry)
    expect(map.addImage).not.toHaveBeenCalled()
    getSpy.mockRestore()
  })

  it('skips config when symbolDef cannot be resolved', async () => {
    const map = makeMap()
    await registerSymbols(map, [{ symbol: 'no-such-symbol' }], mapStyle, symbolRegistry)
    expect(map.addImage).not.toHaveBeenCalled()
    expect(map._symbolImageMap).toEqual({})
  })

  it('rejects when the SVG image fails to load', async () => {
    const originalImage = global.Image
    global.Image = class {
      constructor (w, h) { this.width = w; this.height = h; this._src = '' }
      get src () { return this._src }
      set src (val) { this._src = val; this.onerror?.() }
    }
    try {
      // Register a custom symbol with unique SVG so the module-level cache is bypassed
      const uniqueSvg = '<path d="M0 0 unique-onerror-symbol" fill="{{backgroundColor}}"/>'
      symbolRegistry.register({ id: 'onerror-test', viewBox: '0 0 38 38', anchor: [0.5, 0.5], svg: uniqueSvg })
      const map = makeMap()
      await expect(registerSymbols(map, [{ symbol: 'onerror-test' }], mapStyle, symbolRegistry))
        .rejects.toThrow('Failed to rasterise symbol SVG')
    } finally {
      global.Image = originalImage
    }
  })

  it('processes multiple configs independently', async () => {
    const map = makeMap()
    await registerSymbols(map, [{ symbol: 'pin' }, { symbol: 'circle' }], mapStyle, symbolRegistry)
    expect(map.addImage).toHaveBeenCalledTimes(4)
    expect(Object.keys(map._symbolImageMap)).toHaveLength(2)
  })

  it('reuses cached imageData when called again with the same pixelRatio', async () => {
    // Use an unusual ratio so this test owns its cache entries
    const uniqueRatio = 7

    const map1 = makeMap()
    const blobCallsBefore = global.URL.createObjectURL.mock.calls.length
    await registerSymbols(map1, [{ symbol: 'pin' }], mapStyle, symbolRegistry, uniqueRatio)
    const blobCallsAfterFirst = global.URL.createObjectURL.mock.calls.length
    // Rasterisation ran — blob was created
    expect(blobCallsAfterFirst).toBeGreaterThan(blobCallsBefore)

    // Second call with a fresh map (hasImage → false) but same ratio → cache hit
    const map2 = makeMap()
    await registerSymbols(map2, [{ symbol: 'pin' }], mapStyle, symbolRegistry, uniqueRatio)
    const blobCallsAfterSecond = global.URL.createObjectURL.mock.calls.length
    // No new blob created — rasterisation was skipped via cache
    expect(blobCallsAfterSecond).toBe(blobCallsAfterFirst)
    // addImage still called because map2 has no pre-registered images
    expect(map2.addImage).toHaveBeenCalledTimes(2)
  })
})
