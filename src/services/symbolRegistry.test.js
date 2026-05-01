import { symbolRegistry } from './symbolRegistry.js'
import { symbolDefaults, pin } from '../config/symbolConfig.js'
import { THEME_COLORS } from '../config/mapTheme.js'
import { getValueForStyle } from '../utils/getValueForStyle.js'

const STYLE_ID = 'test'
const mapStyle = { id: STYLE_ID }
const COLOR_OVERRIDE = '#ff0000'
const FILL_OVERRIDE = `fill="${COLOR_OVERRIDE}"`

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
  symbolRegistry.clear()
  symbolRegistry.initialise()
  symbolRegistry.setDefaults({})
})

describe('symbolRegistry — built-in symbols', () => {
  it('registers pin by default', () => {
    const pin = symbolRegistry.get('pin')
    expect(pin).toBeDefined()
    expect(pin.id).toBe('pin')
    expect(pin.anchor).toEqual([0.5, 0.9])
    expect(typeof pin.svg).toBe('string')
  })

  it('registers circle by default', () => {
    const circle = symbolRegistry.get('circle')
    expect(circle).toBeDefined()
    expect(circle.id).toBe('circle')
    expect(circle.anchor).toEqual([0.5, 0.5])
  })

  it('lists both built-in symbols', () => {
    const ids = symbolRegistry.list().map(s => s.id)
    expect(ids).toContain('pin')
    expect(ids).toContain('circle')
  })
})

describe('symbolRegistry — register / get', () => {
  it('registers and retrieves a custom symbol', () => {
    const custom = {
      id: 'test-diamond',
      viewBox: '0 0 20 20',
      anchor: [0.5, 0.5],
      svg: '<rect fill="{{backgroundColor}}"/>'
    }
    symbolRegistry.register(custom)
    expect(symbolRegistry.get('test-diamond')).toBe(custom)
  })

  it('returns undefined for an unregistered id', () => {
    expect(symbolRegistry.get('does-not-exist')).toBeUndefined()
  })
})

describe('symbolRegistry — setDefaults / getDefaults', () => {
  it('getDefaults returns hardcoded defaults when no constructor defaults set', () => {
    const defaults = symbolRegistry.getDefaults()
    expect(defaults.symbol).toBe('pin')
    expect(defaults.backgroundColor).toBe(symbolDefaults.backgroundColor)
  })

  it('constructor defaults override hardcoded defaults', () => {
    symbolRegistry.setDefaults({ backgroundColor: COLOR_OVERRIDE, symbol: 'circle' })
    const defaults = symbolRegistry.getDefaults()
    expect(defaults.backgroundColor).toBe(COLOR_OVERRIDE)
    expect(defaults.symbol).toBe('circle')
  })

  it('constructor defaults do not affect unset properties', () => {
    symbolRegistry.setDefaults({ backgroundColor: COLOR_OVERRIDE })
    const defaults = symbolRegistry.getDefaults()
    expect(defaults.foregroundColor).toBe(symbolDefaults.foregroundColor)
  })

  it('setDefaults with null or undefined resets to hardcoded defaults', () => {
    symbolRegistry.setDefaults({ backgroundColor: COLOR_OVERRIDE })
    symbolRegistry.setDefaults(null)
    expect(symbolRegistry.getDefaults().backgroundColor).toBe(symbolDefaults.backgroundColor)
  })
})

describe('symbolRegistry — resolve', () => {
  const BACKGROUND_SVG = '<path fill="{{backgroundColor}}"/>'
  const symbolDef = {
    id: 'test',
    svg: '<path fill="{{backgroundColor}}" stroke="{{haloColor}}"/><path fill="{{foregroundColor}}" stroke="{{selectedColor}}"/><path stroke="{{activeColor}}"/>'
  }

  it('injects default token values when no overrides given', () => {
    const resolved = symbolRegistry.resolve(symbolDef, {}, mapStyle)
    expect(resolved).toContain(`fill="${getValueForStyle(symbolDefaults.backgroundColor, STYLE_ID)}"`)
    expect(resolved).toContain(`fill="${getValueForStyle(symbolDefaults.foregroundColor, STYLE_ID)}"`)
  })

  it('always produces empty selectedColor and activeColor tokens — rings are hidden', () => {
    const resolved = symbolRegistry.resolve(symbolDef, {}, mapStyle)
    expect(resolved).toContain('stroke="none"')
  })

  it('uses light scheme haloColor when mapStyle has no haloColor', () => {
    const resolved = symbolRegistry.resolve(symbolDef, {}, mapStyle)
    expect(resolved).toContain(`stroke="${THEME_COLORS.light.haloColor}"`)
  })

  it('uses mapStyle.haloColor when provided', () => {
    const resolved = symbolRegistry.resolve(symbolDef, {}, { id: STYLE_ID, haloColor: '#336699' })
    expect(resolved).toContain('stroke="#336699"')
  })

  it('overrides default backgroundColor with a plain string', () => {
    const resolved = symbolRegistry.resolve(symbolDef, { backgroundColor: COLOR_OVERRIDE }, mapStyle)
    expect(resolved).toContain(FILL_OVERRIDE)
  })

  it('overrides default with a style-keyed color', () => {
    const resolved = symbolRegistry.resolve(symbolDef, { backgroundColor: { [STYLE_ID]: '#aabbcc', other: '#112233' } }, mapStyle)
    expect(resolved).toContain('fill="#aabbcc"')
  })

  it('ignores null override values — defaults are preserved', () => {
    const resolved = symbolRegistry.resolve(symbolDef, { backgroundColor: null }, mapStyle)
    expect(resolved).toContain(`fill="${getValueForStyle(symbolDefaults.backgroundColor, STYLE_ID)}"`)
  })

  it('replaces custom tokens not in defaults', () => {
    const customDef = { id: 'custom', svg: '<path fill="{{accentColor}}"/>' }
    const resolved = symbolRegistry.resolve(customDef, { accentColor: '#123456' }, mapStyle)
    expect(resolved).toContain('fill="#123456"')
  })

  it('handles null styleColors — uses all defaults', () => {
    const resolved = symbolRegistry.resolve(symbolDef, null, mapStyle)
    expect(resolved).toContain(`fill="${getValueForStyle(symbolDefaults.backgroundColor, STYLE_ID)}"`)
    expect(resolved).toContain(`fill="${getValueForStyle(symbolDefaults.foregroundColor, STYLE_ID)}"`)
  })

  it('replaces token with empty string when override is an empty string', () => {
    const def = { id: 'es', svg: BACKGROUND_SVG }
    const resolved = symbolRegistry.resolve(def, { backgroundColor: '' }, mapStyle)
    expect(resolved).toContain('fill=""')
  })

  it('returns empty string for null symbolDef', () => {
    expect(symbolRegistry.resolve(null, {}, mapStyle)).toBe('')
  })

  it('constructor defaults take precedence over hardcoded defaults', () => {
    symbolRegistry.setDefaults({ backgroundColor: '#abcdef' })
    const resolved = symbolRegistry.resolve(symbolDef, {}, mapStyle)
    expect(resolved).toContain('fill="#abcdef"')
  })

  it('symbol-level token defaults take precedence over constructor defaults', () => {
    symbolRegistry.setDefaults({ backgroundColor: '#abcdef' })
    const defWithToken = { id: 'td', svg: BACKGROUND_SVG, backgroundColor: '#111111' }
    const resolved = symbolRegistry.resolve(defWithToken, {}, mapStyle)
    expect(resolved).toContain('fill="#111111"')
  })

  it('marker-level overrides take precedence over symbol-level defaults', () => {
    const defWithToken = { id: 'td2', svg: BACKGROUND_SVG, backgroundColor: '#111111' }
    const resolved = symbolRegistry.resolve(defWithToken, { backgroundColor: '#ffffff' }, mapStyle)
    expect(resolved).toContain('fill="#ffffff"')
  })
})

describe('symbolRegistry — resolveActive (keyboard cursor state)', () => {
  const symbolDef = {
    id: 'test-active',
    svg: '<path fill="{{selectedColor}}" stroke="{{activeColor}}" stroke-width="6"/><path fill="{{backgroundColor}}"/>'
  }

  it('renders selectedColor from scheme when mapStyle has no selectedColor', () => {
    const resolved = symbolRegistry.resolveActive(symbolDef, {}, mapStyle)
    expect(resolved).toContain(`fill="${THEME_COLORS.light.selectedColor}"`)
  })

  it('renders activeColor from scheme when mapStyle has no activeColor', () => {
    const resolved = symbolRegistry.resolveActive(symbolDef, {}, mapStyle)
    expect(resolved).toContain(`stroke="${THEME_COLORS.light.activeColor}"`)
  })

  it('uses mapStyle.selectedColor when provided', () => {
    const resolved = symbolRegistry.resolveActive(symbolDef, {}, { id: STYLE_ID, selectedColor: COLOR_OVERRIDE })
    expect(resolved).toContain(FILL_OVERRIDE)
  })

  it('uses mapStyle.activeColor when provided', () => {
    const resolved = symbolRegistry.resolveActive(symbolDef, {}, { id: STYLE_ID, activeColor: '#00ff00' })
    expect(resolved).toContain('stroke="#00ff00"')
  })

  it('handles null styleColors — uses cascade defaults', () => {
    const resolved = symbolRegistry.resolveActive(symbolDef, null, mapStyle)
    expect(resolved).toContain(`fill="${THEME_COLORS.light.selectedColor}"`)
  })

  it('returns empty string for null symbolDef', () => {
    expect(symbolRegistry.resolveActive(null, {}, mapStyle)).toBe('')
  })

  it('symbol-level selectedColor is ignored — mapStyle wins', () => {
    const defWithSelected = { ...symbolDef, selectedColor: '#00ff00' }
    const resolved = symbolRegistry.resolveActive(defWithSelected, {}, { id: STYLE_ID, selectedColor: COLOR_OVERRIDE })
    expect(resolved).toContain(FILL_OVERRIDE)
  })

  it('still resolves other tokens correctly', () => {
    const resolved = symbolRegistry.resolveActive(symbolDef, { backgroundColor: '#d4351c' }, mapStyle)
    expect(resolved).toContain('fill="#d4351c"')
  })
})

describe('symbolRegistry — resolveSelected (committed selection state)', () => {
  const symbolDef = {
    id: 'test-selected',
    svg: '<path fill="{{selectedColor}}"/>'
  }

  it('returns empty string for null symbolDef', () => {
    expect(symbolRegistry.resolveSelected(null, {}, mapStyle)).toBe('')
  })

  it('handles null styleColors — uses cascade defaults', () => {
    const resolved = symbolRegistry.resolveSelected(symbolDef, null, mapStyle)
    expect(typeof resolved).toBe('string')
    expect(resolved.length).toBeGreaterThan(0)
  })
})

describe('symbolRegistry — graphic token', () => {
  const graphicDef = {
    id: 'test-graphic',
    graphic: 'M10 10 L20 20',
    svg: '<path d="{{graphic}}" fill="{{foregroundColor}}"/>'
  }

  it('substitutes graphic d attribute from symbol-level default', () => {
    const resolved = symbolRegistry.resolve(graphicDef, {}, mapStyle)
    expect(resolved).toContain('d="M10 10 L20 20"')
  })

  it('resolves named graphic string to built-in path data', () => {
    const resolved = symbolRegistry.resolve(graphicDef, { graphic: 'cross' }, mapStyle)
    expect(resolved).toContain('d="M6 3H10V6H13V10H10V13H6V10H3V6H6Z"')
  })

  it('overrides symbol-level graphic with marker-level value', () => {
    const resolved = symbolRegistry.resolve(graphicDef, { graphic: 'M0 0 L38 38' }, mapStyle)
    expect(resolved).toContain('d="M0 0 L38 38"')
  })

  it('overrides graphic via constructor defaults', () => {
    symbolRegistry.setDefaults({ graphic: 'M5 5 L15 15' })
    const defNoGraphic = { id: 'no-graphic', svg: '<path d="{{graphic}}"/>' }
    const resolved = symbolRegistry.resolve(defNoGraphic, {}, mapStyle)
    expect(resolved).toContain('d="M5 5 L15 15"')
  })

  it('marker-level graphic overrides constructor default', () => {
    symbolRegistry.setDefaults({ graphic: 'M5 5 L15 15' })
    const defNoGraphic = { id: 'no-graphic2', svg: '<path d="{{graphic}}"/>' }
    const resolved = symbolRegistry.resolve(defNoGraphic, { graphic: 'M1 1 L2 2' }, mapStyle)
    expect(resolved).toContain('d="M1 1 L2 2"')
  })

  it('built-in pin symbol has a graphic default', () => {
    const pin = symbolRegistry.get('pin')
    expect(typeof pin.graphic).toBe('string')
    expect(pin.graphic.length).toBeGreaterThan(0)
  })

  it('built-in circle symbol has a graphic default', () => {
    const circle = symbolRegistry.get('circle')
    expect(typeof circle.graphic).toBe('string')
    expect(circle.graphic.length).toBeGreaterThan(0)
  })

  it('pin resolves graphic token into its svg within a g transform', () => {
    const pin = symbolRegistry.get('pin')
    const resolved = symbolRegistry.resolve(pin, {}, mapStyle)
    expect(resolved).toContain(`d="${pin.graphic}"`)
    expect(resolved).toContain('translate(22, 19) scale(0.8) translate(-8, -8)')
  })
})

// ─── getSymbolDef ─────────────────────────────────────────────────────────────

describe('getSymbolDef', () => {
  it('returns undefined when dataset has no symbol', () => {
    expect(symbolRegistry.getSymbolDef({})).toBeUndefined()
  })

  it('looks up string symbol id in the registry', () => {
    expect(symbolRegistry.getSymbolDef({ symbol: 'pin' })).toBe(pin)
  })

  it('returns undefined for an unregistered string symbol', () => {
    expect(symbolRegistry.getSymbolDef({ symbol: 'missing' })).toBeUndefined()
  })

  it('returns inline def from symbolSvgContent with svg key', () => {
    const dataset = { symbolSvgContent: '<circle/>', symbolViewBox: '0 0 10 10' }
    const result = symbolRegistry.getSymbolDef(dataset)
    expect(result.svg).toBe('<circle/>')
  })

  it('symbolSvgContent takes precedence over symbol id', () => {
    const result = symbolRegistry.getSymbolDef({ symbol: 'pin', symbolSvgContent: '<circle/>' })
    expect(result.svg).toBe('<circle/>')
  })
})

// ─── getSymbolImageId ─────────────────────────────────────────────────────────

describe('getSymbolImageId', () => {
  it('returns null when dataset has no symbol', () => {
    expect(symbolRegistry.getSymbolImageId({}, mapStyle)).toBeNull()
  })

  it('returns null for an unregistered symbol id', () => {
    expect(symbolRegistry.getSymbolImageId({ symbol: 'does-not-exist' }, mapStyle)).toBeNull()
  })

  it('returns a string prefixed symbol- for normal state', () => {
    const id = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle)
    expect(typeof id).toBe('string')
    expect(id).toMatch(/^symbol-[a-z0-9]+-\d+(\.\d+)?x$/)
  })

  it('returns a string prefixed symbol-act- for active state', () => {
    const id = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, true)
    expect(typeof id).toBe('string')
    expect(id).toMatch(/^symbol-act-[a-z0-9]+-\d+(\.\d+)?x$/)
  })

  it('normal and active ids differ for the same dataset', () => {
    const normalId = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, false)
    const activeId = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, true)
    expect(normalId).not.toBe(activeId)
  })

  it('same dataset and style always produces the same id', () => {
    const id1 = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle)
    const id2 = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle)
    expect(id1).toBe(id2)
  })

  it('different symbols produce different ids', () => {
    const pinId = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle)
    const circleId = symbolRegistry.getSymbolImageId({ symbol: 'circle' }, mapStyle)
    expect(pinId).not.toBe(circleId)
  })

  it('different backgrounds produce different ids', () => {
    const redId = symbolRegistry.getSymbolImageId({ symbol: 'pin', symbolBackgroundColor: '#ff0000' }, mapStyle)
    const blueId = symbolRegistry.getSymbolImageId({ symbol: 'pin', symbolBackgroundColor: '#0000ff' }, mapStyle)
    expect(redId).not.toBe(blueId)
  })

  it('resolves inline symbolSvgContent', () => {
    const dataset = {
      symbolSvgContent: '<circle cx="19" cy="19" r="12" fill="{{backgroundColor}}"/>',
      symbolViewBox: '0 0 38 38',
      symbolAnchor: [0.5, 0.5]
    }
    const id = symbolRegistry.getSymbolImageId(dataset, mapStyle)
    expect(id).toMatch(/^symbol-[a-z0-9]+-\d+(\.\d+)?x$/)
  })
})

describe('addSymbolsToMap', () => {
  const makeMap = (existingIds = []) => ({
    _activeSymbolImageMap: {},
    _selectedSymbolImageMap: {},
    hasImage: jest.fn((id) => existingIds.includes(id)),
    addImage: jest.fn()
  })

  describe('registration', () => {
    it('returns early and does not touch map for empty configs', async () => {
      const map = makeMap()
      await symbolRegistry.addSymbolsToMap(map, [], mapStyle)
      expect(map.hasImage).not.toHaveBeenCalled()
      expect(map.addImage).not.toHaveBeenCalled()
    })

    it('resets _activeSymbolImageMap and _selectedSymbolImageMap before processing', async () => {
      const map = makeMap()
      map._activeSymbolImageMap = { stale: 'entry' }
      map._selectedSymbolImageMap = { stale: 'entry' }
      await symbolRegistry.addSymbolsToMap(map, [{ symbol: 'pin' }], mapStyle)
      expect(map._activeSymbolImageMap).not.toHaveProperty('stale')
      expect(map._selectedSymbolImageMap).not.toHaveProperty('stale')
    })

    it('calls addImage for normal, active and selected variants', async () => {
      const map = makeMap()
      await symbolRegistry.addSymbolsToMap(map, [{ symbol: 'pin' }], mapStyle)
      expect(map.addImage).toHaveBeenCalledTimes(3) // NOSONAR S109 — normal, active, selected
      expect(map.addImage).toHaveBeenCalledWith(expect.stringMatching(/^symbol-[a-z0-9]+-\d+(\.\d+)?x$/), expect.any(Object), { pixelRatio: 2 })
      expect(map.addImage).toHaveBeenCalledWith(expect.stringMatching(/^symbol-act-[a-z0-9]+-\d+(\.\d+)?x$/), expect.any(Object), { pixelRatio: 2 })
      expect(map.addImage).toHaveBeenCalledWith(expect.stringMatching(/^symbol-sel-[a-z0-9]+-\d+(\.\d+)?x$/), expect.any(Object), { pixelRatio: 2 })
    })

    it('populates _activeSymbolImageMap and _selectedSymbolImageMap with normal → variant id pairs', async () => {
      const map = makeMap()
      await symbolRegistry.addSymbolsToMap(map, [{ symbol: 'pin' }], mapStyle)
      const normalId = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, false)
      const activeId = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, true)
      const selectedId = map._selectedSymbolImageMap[normalId]
      expect(map._activeSymbolImageMap[normalId]).toBe(activeId)
      expect(selectedId).toMatch(/^symbol-sel-[a-z0-9]+-\d+(\.\d+)?x$/)
    })

    it('skips addImage when all three variant images are already registered', async () => {
    // Run once to discover the selected image ID (not derivable without rasterising)
      const setupMap = makeMap()
      await symbolRegistry.addSymbolsToMap(setupMap, [{ symbol: 'circle' }], mapStyle)
      const normalId = symbolRegistry.getSymbolImageId({ symbol: 'circle' }, mapStyle, false)
      const activeId = symbolRegistry.getSymbolImageId({ symbol: 'circle' }, mapStyle, true)
      const selectedId = setupMap._selectedSymbolImageMap[normalId]

      const map = makeMap([normalId, activeId, selectedId])
      await symbolRegistry.addSymbolsToMap(map, [{ symbol: 'circle' }], mapStyle)
      expect(map.addImage).not.toHaveBeenCalled()
    })

    it('processes multiple configs independently', async () => {
      const map = makeMap()
      await symbolRegistry.addSymbolsToMap(map, [{ symbol: 'pin' }, { symbol: 'circle' }], mapStyle, symbolRegistry)
      expect(map.addImage).toHaveBeenCalledTimes(6) // NOSONAR S109 — 2 configs × 3 variants each
      expect(Object.keys(map._activeSymbolImageMap)).toHaveLength(2)
      expect(Object.keys(map._selectedSymbolImageMap)).toHaveLength(2)
    })
  })

  describe('null results and caching', () => {
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
      await symbolRegistry.addSymbolsToMap(map, [{ symbol: 'pin' }], mapStyle)
      expect(map.addImage).not.toHaveBeenCalled()
      getSpy.mockRestore()
    })

    it('skips config when symbolDef cannot be resolved', async () => {
      const map = makeMap()
      await symbolRegistry.addSymbolsToMap(map, [{ symbol: 'no-such-symbol' }], mapStyle)
      expect(map.addImage).not.toHaveBeenCalled()
      expect(map._activeSymbolImageMap).toEqual({})
      expect(map._selectedSymbolImageMap).toEqual({})
    })

    it('reuses cached imageData when called again with the same pixelRatio', async () => {
    // Use an unusual ratio so this test owns its cache entries
      const uniqueRatio = 7
      symbolRegistry.clear()
      symbolRegistry.initialise()

      const map1 = makeMap()
      const getContextCallsBefore = HTMLCanvasElement.prototype.getContext.mock.calls.length
      await symbolRegistry.addSymbolsToMap(map1, [{ symbol: 'pin' }], mapStyle, uniqueRatio)
      const getContextCallsAfterFirst = HTMLCanvasElement.prototype.getContext.mock.calls.length
      // Rasterisation ran — canvas was used
      expect(getContextCallsAfterFirst).toBeGreaterThan(getContextCallsBefore)

      // Second call with a fresh map (hasImage → false) but same ratio → cache hit
      const map2 = makeMap()
      await symbolRegistry.addSymbolsToMap(map2, [{ symbol: 'pin' }], mapStyle, uniqueRatio)
      const getContextCallsAfterSecond = HTMLCanvasElement.prototype.getContext.mock.calls.length
      // No new canvas — rasterisation was skipped via cache
      expect(getContextCallsAfterSecond).toBe(getContextCallsAfterFirst)
      // addImage still called because map2 has no pre-registered images
      expect(map2.addImage).toHaveBeenCalledTimes(3) // NOSONAR S109 — normal, active, selected
    })
  })
})
