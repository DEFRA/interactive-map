import { anchorToMaplibre, getSymbolImageId, addSymbolsToMap } from './symbolImages.js'
import { symbolRegistry } from '../../../../src/services/symbolRegistry.js'

const STYLE_ID = 'test'
const mapStyle = { id: STYLE_ID }

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

  it('returns a string prefixed symbol-act- for active state', () => {
    const id = getSymbolImageId({ symbol: 'pin' }, mapStyle, symbolRegistry, true)
    expect(typeof id).toBe('string')
    expect(id).toMatch(/^symbol-act-[a-z0-9]+-\d+(\.\d+)?x$/)
  })

  it('normal and active ids differ for the same dataset', () => {
    const normalId = getSymbolImageId({ symbol: 'pin' }, mapStyle, symbolRegistry, false)
    const activeId = getSymbolImageId({ symbol: 'pin' }, mapStyle, symbolRegistry, true)
    expect(normalId).not.toBe(activeId)
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

// ─── addSymbolsToMap ──────────────────────────────────────────────────────────

const makeMap = (existingIds = []) => ({
  _activeSymbolImageMap: {},
  _selectedSymbolImageMap: {},
  hasImage: jest.fn((id) => existingIds.includes(id)),
  addImage: jest.fn()
})

describe('addSymbolsToMap — registration', () => {
  it('returns early and does not touch map for empty configs', async () => {
    const map = makeMap()
    await addSymbolsToMap(map, [], mapStyle, symbolRegistry)
    expect(map.hasImage).not.toHaveBeenCalled()
    expect(map.addImage).not.toHaveBeenCalled()
  })

  it('resets _activeSymbolImageMap and _selectedSymbolImageMap before processing', async () => {
    const map = makeMap()
    map._activeSymbolImageMap = { stale: 'entry' }
    map._selectedSymbolImageMap = { stale: 'entry' }
    await addSymbolsToMap(map, [{ symbol: 'pin' }], mapStyle, symbolRegistry)
    expect(map._activeSymbolImageMap).not.toHaveProperty('stale')
    expect(map._selectedSymbolImageMap).not.toHaveProperty('stale')
  })

  it('calls addImage for normal, active and selected variants', async () => {
    const map = makeMap()
    await addSymbolsToMap(map, [{ symbol: 'pin' }], mapStyle, symbolRegistry)
    expect(map.addImage).toHaveBeenCalledTimes(3) // NOSONAR S109 — normal, active, selected
    expect(map.addImage).toHaveBeenCalledWith(expect.stringMatching(/^symbol-[a-z0-9]+-\d+(\.\d+)?x$/), expect.any(Object), { pixelRatio: 2 })
    expect(map.addImage).toHaveBeenCalledWith(expect.stringMatching(/^symbol-act-[a-z0-9]+-\d+(\.\d+)?x$/), expect.any(Object), { pixelRatio: 2 })
    expect(map.addImage).toHaveBeenCalledWith(expect.stringMatching(/^symbol-sel-[a-z0-9]+-\d+(\.\d+)?x$/), expect.any(Object), { pixelRatio: 2 })
  })

  it('populates _activeSymbolImageMap and _selectedSymbolImageMap with normal → variant id pairs', async () => {
    const map = makeMap()
    await addSymbolsToMap(map, [{ symbol: 'pin' }], mapStyle, symbolRegistry)
    const normalId = getSymbolImageId({ symbol: 'pin' }, mapStyle, symbolRegistry, false)
    const activeId = getSymbolImageId({ symbol: 'pin' }, mapStyle, symbolRegistry, true)
    const selectedId = map._selectedSymbolImageMap[normalId]
    expect(map._activeSymbolImageMap[normalId]).toBe(activeId)
    expect(selectedId).toMatch(/^symbol-sel-[a-z0-9]+-\d+(\.\d+)?x$/)
  })

  it('skips addImage when all three variant images are already registered', async () => {
    // Run once to discover the selected image ID (not derivable without rasterising)
    const setupMap = makeMap()
    await addSymbolsToMap(setupMap, [{ symbol: 'circle' }], mapStyle, symbolRegistry)
    const normalId = getSymbolImageId({ symbol: 'circle' }, mapStyle, symbolRegistry, false)
    const activeId = getSymbolImageId({ symbol: 'circle' }, mapStyle, symbolRegistry, true)
    const selectedId = setupMap._selectedSymbolImageMap[normalId]

    const map = makeMap([normalId, activeId, selectedId])
    await addSymbolsToMap(map, [{ symbol: 'circle' }], mapStyle, symbolRegistry)
    expect(map.addImage).not.toHaveBeenCalled()
  })

  it('processes multiple configs independently', async () => {
    const map = makeMap()
    await addSymbolsToMap(map, [{ symbol: 'pin' }, { symbol: 'circle' }], mapStyle, symbolRegistry)
    expect(map.addImage).toHaveBeenCalledTimes(6) // NOSONAR S109 — 2 configs × 3 variants each
    expect(Object.keys(map._activeSymbolImageMap)).toHaveLength(2)
    expect(Object.keys(map._selectedSymbolImageMap)).toHaveLength(2)
  })
})

describe('addSymbolsToMap — null results and caching', () => {
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
    await addSymbolsToMap(map, [{ symbol: 'pin' }], mapStyle, symbolRegistry)
    expect(map.addImage).not.toHaveBeenCalled()
    getSpy.mockRestore()
  })

  it('skips config when symbolDef cannot be resolved', async () => {
    const map = makeMap()
    await addSymbolsToMap(map, [{ symbol: 'no-such-symbol' }], mapStyle, symbolRegistry)
    expect(map.addImage).not.toHaveBeenCalled()
    expect(map._activeSymbolImageMap).toEqual({})
    expect(map._selectedSymbolImageMap).toEqual({})
  })

  it('reuses cached imageData when called again with the same pixelRatio', async () => {
    // Use an unusual ratio so this test owns its cache entries
    const uniqueRatio = 7

    const map1 = makeMap()
    const getContextCallsBefore = HTMLCanvasElement.prototype.getContext.mock.calls.length
    await addSymbolsToMap(map1, [{ symbol: 'pin' }], mapStyle, symbolRegistry, uniqueRatio)
    const getContextCallsAfterFirst = HTMLCanvasElement.prototype.getContext.mock.calls.length
    // Rasterisation ran — canvas was used
    expect(getContextCallsAfterFirst).toBeGreaterThan(getContextCallsBefore)

    // Second call with a fresh map (hasImage → false) but same ratio → cache hit
    const map2 = makeMap()
    await addSymbolsToMap(map2, [{ symbol: 'pin' }], mapStyle, symbolRegistry, uniqueRatio)
    const getContextCallsAfterSecond = HTMLCanvasElement.prototype.getContext.mock.calls.length
    // No new canvas — rasterisation was skipped via cache
    expect(getContextCallsAfterSecond).toBe(getContextCallsAfterFirst)
    // addImage still called because map2 has no pre-registered images
    expect(map2.addImage).toHaveBeenCalledTimes(3) // NOSONAR S109 — normal, active, selected
  })
})
