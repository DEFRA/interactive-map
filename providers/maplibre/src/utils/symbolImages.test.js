import { anchorToMaplibre, anchorToMaplibreOffset, getSymbolIconLayout, SymbolImageVariants } from './symbolImages.js'
import { symbolRegistry } from '../../../../src/services/symbolRegistry.js'

beforeAll(() => {
  globalThis.URL.createObjectURL = jest.fn(() => 'blob:mock')
  globalThis.URL.revokeObjectURL = jest.fn()

  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn((_x, _y, w, h) => ({ width: w, height: h }))
  }))

  globalThis.Image = class {
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

  it('returns top for [0.5, 0]', () => {
    expect(anchorToMaplibre([0.5, 0])).toBe('top')
  })

  it('returns bottom for [0.5, 1]', () => {
    expect(anchorToMaplibre([0.5, 1])).toBe('bottom')
  })

  it('returns left for [0, 0.5]', () => {
    expect(anchorToMaplibre([0, 0.5])).toBe('left')
  })

  it('returns right for [1, 0.5]', () => {
    expect(anchorToMaplibre([1, 0.5])).toBe('right')
  })

  it('returns top-left for [0, 0]', () => {
    expect(anchorToMaplibre([0, 0])).toBe('top-left')
  })

  it('returns top-right for [1, 0]', () => {
    expect(anchorToMaplibre([1, 0])).toBe('top-right')
  })

  it('returns bottom-left for [0, 1]', () => {
    expect(anchorToMaplibre([0, 1])).toBe('bottom-left')
  })

  it('returns bottom-right for [1, 1]', () => {
    expect(anchorToMaplibre([1, 1])).toBe('bottom-right')
  })

  it('snaps pin anchor [0.5, 0.9] to bottom', () => {
    expect(anchorToMaplibre([0.5, 0.9])).toBe('bottom') // NOSONAR S109 — deliberate boundary test value
  })

  it('returns center for values in the middle band', () => {
    expect(anchorToMaplibre([0.5, 0.5])).toBe('center')
    expect(anchorToMaplibre([0.26, 0.26])).toBe('center') // NOSONAR S109 — just inside center band
    expect(anchorToMaplibre([0.74, 0.74])).toBe('center') // NOSONAR S109 — just inside center band
  })

  it('returns top at boundary value 0.25', () => {
    expect(anchorToMaplibre([0.5, 0.25])).toBe('top')
  })

  it('returns bottom at boundary value 0.75', () => {
    expect(anchorToMaplibre([0.5, 0.75])).toBe('bottom') // NOSONAR S109 — ANCHOR_HIGH boundary
  })
})

// ─── anchorToMaplibreOffset ───────────────────────────────────────────────────

describe('anchorToMaplibreOffset', () => {
  const VIEW_BOX = '0 0 44 44'

  it('is zero for an anchor that already sits exactly on a discrete position', () => {
    expect(anchorToMaplibreOffset([0.5, 0.5], VIEW_BOX)).toEqual([0, 0]) // center
    expect(anchorToMaplibreOffset([0, 0], VIEW_BOX)).toEqual([0, 0]) // top-left
    expect(anchorToMaplibreOffset([1, 1], VIEW_BOX)).toEqual([0, 0]) // bottom-right
  })

  it('corrects for pin-style [0.5, 0.9] snapping to bottom (1.0)', () => {
    expect(anchorToMaplibreOffset([0.5, 0.9], VIEW_BOX)).toEqual([0, 4.4])
  })

  it('corrects both axes when both are off-grid', () => {
    // 0.1 snaps to 'left'/'top' (0), 0.9 snaps to 'right'/'bottom' (1)
    expect(anchorToMaplibreOffset([0.1, 0.1], VIEW_BOX)).toEqual([-4.4, -4.4])
    expect(anchorToMaplibreOffset([0.9, 0.9], VIEW_BOX)).toEqual([4.4, 4.4])
  })

  it('still corrects a value inside the centre band that is not exactly 0.5 — the whole band snaps to 0.5, not just its edges', () => {
    expect(anchorToMaplibreOffset([0.4, 0.6], VIEW_BOX)).toEqual([4.4, -4.4])
  })

  it('scales with the viewBox, not just the anchor fraction', () => {
    expect(anchorToMaplibreOffset([0.5, 0.9], '0 0 100 100')).toEqual([0, 10])
  })
})

// ─── getSymbolIconLayout ──────────────────────────────────────────────────────

describe('getSymbolIconLayout', () => {
  it('snaps to the nearest icon-anchor and offsets the rest of the way', () => {
    expect(getSymbolIconLayout({ anchor: [0.5, 0.9], viewBox: '0 0 44 44' })).toEqual({ 'icon-anchor': 'bottom', 'icon-offset': [0, 4.4] })
  })

  it('places a sized built-in symbol on its own anchor point', () => {
    const symbolDef = symbolRegistry.getSymbolDef({ symbol: 'pin' })
    const [, , width, height] = symbolDef.viewBox.split(' ').map(Number)
    const { 'icon-offset': [offsetX, offsetY] } = getSymbolIconLayout(symbolDef)
    // icon-offset moves the image, so the point lands that far back from the snapped edge
    expect(width / 2 - offsetX).toBeCloseTo(symbolDef.anchor[0] * width)
    expect(height - offsetY).toBeCloseTo(symbolDef.anchor[1] * height)
  })
})

// ─── SymbolImageVariants ──────────────────────────────────────────────────────

const makeMap = (existingIds = []) => ({
  hasImage: jest.fn((id) => existingIds.includes(id)),
  addImage: jest.fn()
})
const STYLE_ID = 'test'
const mapStyle = { id: STYLE_ID }
const PIXEL_RATIO = 2

// Registers the configs with a fresh SymbolImageVariants for the map, and returns it
const register = async (map, configs, pixelRatio = PIXEL_RATIO, symbolImages = new SymbolImageVariants(map)) => {
  await symbolImages.registerSymbols(configs, mapStyle, symbolRegistry, pixelRatio)
  return symbolImages
}

describe('SymbolImageVariants — registration', () => {
  it('does not touch the map for empty configs', async () => {
    const map = makeMap()
    await register(map, [])
    expect(map.hasImage).not.toHaveBeenCalled()
    expect(map.addImage).not.toHaveBeenCalled()
  })

  it('adds to the variants already registered rather than replacing them', async () => {
    // More than one caller (datasets, draw, ...) registers symbols on the same map
    const map = makeMap()
    const symbolImages = await register(map, [{ symbol: 'circle' }])
    await register(map, [{ symbol: 'pin' }], PIXEL_RATIO, symbolImages)
    const circleId = symbolRegistry.getSymbolImageId({ symbol: 'circle' }, mapStyle, false, PIXEL_RATIO)
    const pinId = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, false, PIXEL_RATIO)
    expect(symbolImages.getActiveImageId(circleId)).not.toBeNull()
    expect(symbolImages.getSelectedImageId(circleId)).not.toBeNull()
    expect(symbolImages.getActiveImageId(pinId)).not.toBeNull()
  })

  it('calls addImage for normal, active and selected variants', async () => {
    const map = makeMap()
    await register(map, [{ symbol: 'pin' }])
    expect(map.addImage).toHaveBeenCalledTimes(3) // NOSONAR S109 — normal, active, selected
    expect(map.addImage).toHaveBeenCalledWith(expect.stringMatching(/^symbol-[a-z0-9]+-\d+(\.\d+)?x$/), expect.any(Object), { pixelRatio: 2 })
    expect(map.addImage).toHaveBeenCalledWith(expect.stringMatching(/^symbol-act-[a-z0-9]+-\d+(\.\d+)?x$/), expect.any(Object), { pixelRatio: 2 })
    expect(map.addImage).toHaveBeenCalledWith(expect.stringMatching(/^symbol-sel-[a-z0-9]+-\d+(\.\d+)?x$/), expect.any(Object), { pixelRatio: 2 })
  })

  it('maps each normal image id to its active and selected variants', async () => {
    const symbolImages = await register(makeMap(), [{ symbol: 'pin' }])
    const normalId = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, false, PIXEL_RATIO)
    const activeId = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, true, PIXEL_RATIO)
    const selectedId = symbolImages.getSelectedImageId(normalId)
    expect(symbolImages.getActiveImageId(normalId)).toBe(activeId)
    expect(selectedId).toMatch(/^symbol-sel-[a-z0-9]+-\d+(\.\d+)?x$/)
  })

  it('skips addImage when all three variant images are already registered', async () => {
    // Run once to discover the selected image ID (not derivable without rasterising)
    const setup = await register(makeMap(), [{ symbol: 'circle' }])
    const normalId = symbolRegistry.getSymbolImageId({ symbol: 'circle' }, mapStyle, false, PIXEL_RATIO)
    const activeId = symbolRegistry.getSymbolImageId({ symbol: 'circle' }, mapStyle, true, PIXEL_RATIO)
    const selectedId = setup.getSelectedImageId(normalId)

    const map = makeMap([normalId, activeId, selectedId])
    await register(map, [{ symbol: 'circle' }])
    expect(map.addImage).not.toHaveBeenCalled()
  })

  it('processes multiple configs independently', async () => {
    const map = makeMap()
    const symbolImages = await register(map, [{ symbol: 'pin' }, { symbol: 'circle' }])
    expect(map.addImage).toHaveBeenCalledTimes(6) // NOSONAR S109 — 2 configs × 3 variants each
    expect(symbolImages.activeImageIds.size).toBe(2)
    expect(symbolImages.selectedImageIds.size).toBe(2)
  })
})

describe('SymbolImageVariants — null results and caching', () => {
  it('does not call addImage when rasteriseSymbolImage returns null', async () => {
    // getSymbolImageId (called twice — normal + active) needs a real symbolDef to produce imageIds,
    // but rasteriseSymbolImage must get undefined from getSymbolDef so it returns null.
    // The registry.get call order: [1] getSymbolImageId normal, [2] getSymbolImageId active,
    // [3] rasteriseSymbolImage normal, [4] rasteriseSymbolImage active, [5] rasteriseSymbolImage selected.
    const pinDef = symbolRegistry.get('pin')
    const getSpy = jest.spyOn(symbolRegistry, 'get')
      .mockReturnValueOnce(pinDef)
      .mockReturnValueOnce(pinDef)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined)
    const map = makeMap()
    await register(map, [{ symbol: 'pin' }])
    expect(map.addImage).not.toHaveBeenCalled()
    getSpy.mockRestore()
  })

  it('skips config when symbolDef cannot be resolved', async () => {
    const map = makeMap()
    const symbolImages = await register(map, [{ symbol: 'no-such-symbol' }])
    expect(map.addImage).not.toHaveBeenCalled()
    expect(symbolImages.activeImageIds.size).toBe(0)
    expect(symbolImages.selectedImageIds.size).toBe(0)
  })

  it('reuses cached imageData when called again with the same pixelRatio', async () => {
    // Use an unusual ratio so this test owns its cache entries
    const uniqueRatio = 7

    const map1 = makeMap()
    const getContextCallsBefore = HTMLCanvasElement.prototype.getContext.mock.calls.length
    await register(map1, [{ symbol: 'pin' }], uniqueRatio)
    const getContextCallsAfterFirst = HTMLCanvasElement.prototype.getContext.mock.calls.length
    // Rasterisation ran — canvas was used
    expect(getContextCallsAfterFirst).toBeGreaterThan(getContextCallsBefore)

    // Second call with a fresh map (hasImage → false) but same ratio → cache hit
    const map2 = makeMap()
    await register(map2, [{ symbol: 'pin' }], uniqueRatio)
    const getContextCallsAfterSecond = HTMLCanvasElement.prototype.getContext.mock.calls.length
    // No new canvas — rasterisation was skipped via cache
    expect(getContextCallsAfterSecond).toBe(getContextCallsAfterFirst)
    // addImage still called because map2 has no pre-registered images
    expect(map2.addImage).toHaveBeenCalledTimes(3) // NOSONAR S109 — normal, active, selected
  })
})

describe('SymbolImageVariants — removing images from older map sizes and styles', () => {
  // A map that keeps the images added to it, like MapLibre's image store
  const makeImageStore = () => {
    const images = new Set()
    return {
      images,
      hasImage: jest.fn((id) => images.has(id)),
      addImage: jest.fn((id) => images.add(id)),
      removeImage: jest.fn((id) => images.delete(id))
    }
  }
  const pinIds = (symbolImages, pixelRatio) => {
    const normalId = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, false, pixelRatio)
    return [normalId, symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, true, pixelRatio), symbolImages.getSelectedImageId(normalId)]
  }

  it('keeps the current and previous size, and removes an older one\'s images when a third arrives', async () => {
    const map = makeImageStore()
    const symbolImages = new SymbolImageVariants(map)
    await register(map, [{ symbol: 'pin' }], 1, symbolImages)
    const oldIds = pinIds(symbolImages, 1)
    await register(map, [{ symbol: 'pin' }], 2, symbolImages)
    oldIds.forEach((imageId) => expect(map.images.has(imageId)).toBe(true))

    await register(map, [{ symbol: 'pin' }], 3, symbolImages)
    oldIds.forEach((imageId) => expect(map.images.has(imageId)).toBe(false))
    expect(symbolImages.getActiveImageId(oldIds[0])).toBeNull()
    expect(symbolImages.getSelectedImageId(oldIds[0])).toBeNull()
    pinIds(symbolImages, 2).concat(pinIds(symbolImages, 3)).forEach((imageId) => expect(map.images.has(imageId)).toBe(true))
    expect(map.images.size).toBe(6) // NOSONAR S109 — two sizes × normal, active, selected
  })

  it('keeps an image the map no longer has, e.g. after a style change, without removing it', async () => {
    const map = makeImageStore()
    const symbolImages = new SymbolImageVariants(map)
    await register(map, [{ symbol: 'pin' }], 1, symbolImages)
    map.images.clear()
    await register(map, [{ symbol: 'pin' }], 2, symbolImages)
    await register(map, [{ symbol: 'pin' }], 3, symbolImages)
    expect(map.removeImage).not.toHaveBeenCalled()
  })
})

// End to end across the symbol pipeline: whatever the shape, size or anchor override, MapLibre's
// snapped icon-anchor plus the icon-offset must land the symbol's true anchor pixel on the
// coordinate — the same pixel HTML markers and OpenLayers place directly from the fraction.
describe('anchor placement across symbols, sizes and overrides', () => {
  const ANCHOR_POSITIONS = {
    left: 0, right: 1, top: 0, bottom: 1, center: 0.5
  }
  // icon-anchor names the point of the image placed on the coordinate, as fractions
  const discretePoint = (name) => {
    if (name === 'center') { return [0.5, 0.5] }
    const parts = name.split('-')
    const x = parts.find((p) => p === 'left' || p === 'right')
    const y = parts.find((p) => p === 'top' || p === 'bottom')
    return [x ? ANCHOR_POSITIONS[x] : 0.5, y ? ANCHOR_POSITIONS[y] : 0.5]
  }
  const styles = [
    ...['pin', 'circle', 'square', 'hexagon', 'triangle', 'diamond'].map((symbol) => ({ symbol })),
    { symbolSvgContent: '<rect width="30" height="20"/>', symbolViewBox: '0 0 30 20', symbolAnchor: [0.3, 0.9] }
  ]
  const overrides = [undefined, [0, 0], [0.5, 1], [1, 0.25]]

  styles.forEach((baseStyle) => {
    ['small', 'medium', 'large'].forEach((symbolSize) => {
      overrides.forEach((symbolAnchor) => {
        const style = { ...baseStyle, symbolSize, ...(symbolAnchor && { symbolAnchor }) }
        it(`${baseStyle.symbol ?? 'custom svg'} ${symbolSize} anchor ${JSON.stringify(symbolAnchor ?? 'default')}`, () => {
          const { viewBox, anchor } = symbolRegistry.getSymbolDef(style)
          const [,, width, height] = viewBox.split(' ').map(Number)
          const [dx, dy] = discretePoint(anchorToMaplibre(anchor))
          const [ox, oy] = anchorToMaplibreOffset(anchor, viewBox)
          // the discrete anchor point, shifted by the offset, is the true anchor pixel (offset is 2dp)
          expect(dx * width - ox).toBeCloseTo(anchor[0] * width, 1)
          expect(dy * height - oy).toBeCloseTo(anchor[1] * height, 1)
        })
      })
    })
  })
})
