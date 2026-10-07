import { createSymbolRegistry } from './symbolRegistry.js'
import { symbolDefaults, pin } from '../config/symbolConfig.js'
import { THEME_COLORS } from '../config/mapTheme.js'
import { getValueForStyle } from '../utils/getValueForStyle.js'
import { rasteriseToImageData } from '../utils/rasteriseToImageData.js'

const symbolRegistry = createSymbolRegistry()

jest.mock('../utils/rasteriseToImageData.js', () => ({ rasteriseToImageData: jest.fn(async (svg, width, height) => ({ width, height })) }))

const STYLE_ID = 'test'
const mapStyle = { id: STYLE_ID }
const COLOR_OVERRIDE = '#ff0000'
const FILL_OVERRIDE = `fill="${COLOR_OVERRIDE}"`

beforeEach(() => {
  symbolRegistry.clear()
  symbolRegistry.initialise()
  symbolRegistry.setDefaults({})
})

const BUILT_IN_IDS = ['pin', 'circle', 'square', 'hexagon', 'triangle', 'diamond']
const SIZES = { small: 0.75, medium: 1, large: 1.25 }
const dims = (viewBox) => viewBox.split(' ').map(Number).slice(2)
const countPaths = (svg) => svg.match(/<path /g).length

describe('createSymbolRegistry', () => {
  it('gives each registry its own symbols and defaults', () => {
    const first = createSymbolRegistry()
    const second = createSymbolRegistry()
    first.register({ id: 'flag', svg: '<path/>', viewBox: '0 0 10 10' })
    first.setDefaults({ symbol: 'circle' })
    expect(second.get('flag')).toBeUndefined()
    expect(second.getDefaults().symbol).toBe('pin')
    expect(first.getDefaults().symbol).toBe('circle')
  })

  it('starts with the built-in symbols', () => {
    expect(createSymbolRegistry().list().map((symbolDef) => symbolDef.id)).toEqual(BUILT_IN_IDS)
  })
})

describe('symbolRegistry — built-in symbols', () => {
  it('registers every built-in as a single body path with bounds, anchor point and graphic centre', () => {
    BUILT_IN_IDS.forEach((id) => {
      const def = symbolRegistry.get(id)
      expect(def.id).toBe(id)
      expect(typeof def.path).toBe('string')
      expect(def.bounds).toHaveLength(4)
      expect(def.anchorPoint).toHaveLength(2)
      expect(def.graphicCentre).toHaveLength(2)
    })
  })

  it('lists all built-in symbols', () => {
    const ids = symbolRegistry.list().map(s => s.id)
    expect(ids).toEqual(expect.arrayContaining(BUILT_IN_IDS))
  })

  it('sizes pin at medium to a 44×52 viewBox, anchored on the tip of its halo', () => {
    const sized = symbolRegistry.getSymbolDef({ symbol: 'pin' })
    expect(sized.viewBox).toBe('0 0 44 52')
    expect(sized.anchor[0]).toBe(0.5)
    expect(sized.anchor[1]).toBeCloseTo(0.8317, 4)
  })

  it('keeps each anchor on its anchorPoint at every size', () => {
    BUILT_IN_IDS.forEach((id) => {
      const { bounds: [bx, by, bw, bh], anchorPoint: [ax, ay] } = symbolRegistry.get(id)
      Object.entries(SIZES).forEach(([symbolSize, scale]) => {
        const { viewBox, anchor } = symbolRegistry.getSymbolDef({ symbol: id, symbolSize })
        const [width, height] = dims(viewBox)
        // body is centred in the viewBox, so the anchor point lands at centring offset + scaled distance
        expect(anchor[0] * width).toBeCloseTo((width - bw * scale) / 2 + (ax - bx) * scale, 1)
        expect(anchor[1] * height).toBeCloseTo((height - bh * scale) / 2 + (ay - by) * scale, 1)
      })
    })
  })

  it('scales the body but keeps at least an 8px margin for the rings, rounding the viewBox up to a multiple of 4', () => {
    BUILT_IN_IDS.forEach((id) => {
      const [,, bw, bh] = symbolRegistry.get(id).bounds
      Object.entries(SIZES).forEach(([symbolSize, scale]) => {
        const [width, height] = dims(symbolRegistry.getSymbolDef({ symbol: id, symbolSize }).viewBox)
        expect(width % 4).toBe(0)
        expect(height % 4).toBe(0)
        expect(width - bw * scale).toBeGreaterThanOrEqual(16)
        expect(width - bw * scale).toBeLessThan(20)
        expect(height - bh * scale).toBeGreaterThanOrEqual(16)
        expect(height - bh * scale).toBeLessThan(20)
      })
    })
  })

  it('gives a whole-pixel image size at every common pixel ratio except 1.875', () => {
    const ratios = [1, 1.25, 1.5, 2, 2.25, 2.5, 3, 4] // device 1 / 1.25 / 1.5 / 2 × map size 1 / 1.5 / 2
    BUILT_IN_IDS.forEach((id) => {
      Object.keys(SIZES).forEach((symbolSize) => {
        const [width, height] = dims(symbolRegistry.getSymbolDef({ symbol: id, symbolSize }).viewBox)
        ratios.forEach((ratio) => {
          expect(Number.isInteger(width * ratio)).toBe(true)
          expect(Number.isInteger(height * ratio)).toBe(true)
        })
      })
    })
  })

  it('draws the halo and rings at a fixed width whatever the scale', () => {
    const small = symbolRegistry.resolveActive(symbolRegistry.getSymbolDef({ symbol: 'circle', symbolSize: 'small' }), {}, mapStyle)
    expect(small).toContain('scale(0.75)')
    // stroke widths are divided by the scale so they render at 14 / 8 / 2 px
    expect(small).toContain('stroke-width="18.667"')
    expect(small).toContain('stroke-width="10.667"')
    expect(small).toContain('stroke-width="2.667"')
    const large = symbolRegistry.resolveActive(symbolRegistry.getSymbolDef({ symbol: 'circle', symbolSize: 'large' }), {}, mapStyle)
    expect(large).toContain('stroke-width="11.2"')
    expect(large).toContain('stroke-width="6.4"')
    expect(large).toContain('stroke-width="1.6"')
  })

  it('only emits the rings that are showing', () => {
    const def = symbolRegistry.getSymbolDef({ symbol: 'hexagon' })
    expect(countPaths(symbolRegistry.resolve(def, {}, mapStyle))).toBe(2) // body + graphic
    expect(countPaths(symbolRegistry.resolveSelected(def, {}, mapStyle))).toBe(3)
    expect(countPaths(symbolRegistry.resolveActive(def, {}, mapStyle))).toBe(4)
  })

  it('renders an unsized registered built-in at medium', () => {
    const fromRaw = symbolRegistry.resolve(symbolRegistry.get('square'), {}, mapStyle)
    expect(fromRaw).toBe(symbolRegistry.resolve(symbolRegistry.getSymbolDef({ symbol: 'square' }), {}, mapStyle))
  })

  it('uses the map\'s default size when a style has none', () => {
    symbolRegistry.setDefaults({ size: 'large' })
    expect(symbolRegistry.getSymbolDef({ symbol: 'circle' }).scale).toBe(1.25)
  })

  it('falls back to medium for an unknown symbolSize', () => {
    expect(symbolRegistry.getSymbolDef({ symbol: 'circle', symbolSize: 'huge' }).scale).toBe(1)
  })
})

describe('symbolRegistry — SVG-template symbols', () => {
  const custom = { id: 'custom', svg: '<rect fill="{{backgroundColor}}"/>', viewBox: '0 0 20 10', anchor: [0.5, 1] }

  it('leaves the svg and viewBox as they are at medium', () => {
    const sized = symbolRegistry.getSizedSymbolDef(custom)
    expect(sized.viewBox).toBe('0 0 20 10')
    expect(sized.svg).toBe(custom.svg)
    expect(sized.anchor).toEqual([0.5, 1])
  })

  it('scales the whole symbol, viewBox included, at other sizes', () => {
    const sized = symbolRegistry.getSizedSymbolDef(custom, { size: 'large' })
    expect(sized.viewBox).toBe('0 0 25 12.5')
    expect(sized.svg).toBe(`<g transform="scale(1.25)">${custom.svg}</g>`)
  })

  it('folds a symbolViewBox override into inline symbolSvgContent before scaling', () => {
    const sized = symbolRegistry.getSymbolDef({ symbolSvgContent: '<circle/>', symbolViewBox: '0 0 10 10', symbolSize: 'small' })
    expect(sized.viewBox).toBe('0 0 7.5 7.5')
  })

  it('defaults inline symbolSvgContent to a 44×44 viewBox', () => {
    expect(symbolRegistry.getSymbolDef({ symbolSvgContent: '<circle/>' }).viewBox).toBe('0 0 44 44')
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

  it.each([
    [{ svg: '<rect/>', viewBox: '0 0 1 1' }, 'needs a string "id"'],
    [{ id: 'no-svg', viewBox: '0 0 1 1' }, 'symbol "no-svg" needs an "svg" template'],
    [{ id: 'no-viewbox', svg: '<rect/>' }, 'symbol "no-viewbox" needs a "viewBox"'],
    [{ id: 'bad-viewbox', svg: '<rect/>', viewBox: '0 0 10' }, 'symbol "bad-viewbox" needs a "viewBox"'],
    [{ id: 'bad-anchor', svg: '<rect/>', viewBox: '0 0 1 1', anchor: [0.5] }, 'symbol "bad-anchor" has an invalid "anchor"'],
    [{ id: 'no-bounds', path: 'M0 0H1V1Z', anchorPoint: [0, 0], graphicCentre: [0, 0] }, 'symbol "no-bounds" has a "path" but no valid "bounds"'],
    [{ id: 'no-points', path: 'M0 0H1V1Z', bounds: [0, 0, 1, 1] }, 'symbol "no-points" has a "path" but no valid "anchorPoint" and "graphicCentre"']
  ])('rejects an incomplete definition with a clear error (%#)', (symbolDef, message) => {
    expect(() => symbolRegistry.register(symbolDef)).toThrow(message)
  })

  it('accepts a viewBox written with commas', () => {
    expect(() => symbolRegistry.register({ id: 'commas', svg: '<rect/>', viewBox: '0,0,10,10' })).not.toThrow()
  })
})

describe('symbolRegistry — image ids and rasterising', () => {
  it('gives the same SVG content at different viewBoxes different image ids', () => {
    const style = { symbolSvgContent: '<circle r="4" fill="{{backgroundColor}}"/>' }
    const small = symbolRegistry.getSymbolImageId({ ...style, symbolViewBox: '0 0 10 10' }, mapStyle, 'normal', 2)
    const big = symbolRegistry.getSymbolImageId({ ...style, symbolViewBox: '0 0 20 20' }, mapStyle, 'normal', 2)
    expect(small).not.toBe(big)
  })

  it('rasterises at the sized viewBox × pixelRatio, under the same id getSymbolImageId gives', async () => {
    const style = { symbol: 'circle', symbolSize: 'large' }
    const { imageId, imageData } = await symbolRegistry.rasteriseSymbolImage(style, mapStyle, 'normal', 2)
    const [,, width, height] = symbolRegistry.getSymbolDef(style).viewBox.split(' ').map(Number)
    expect(imageData).toEqual({ width: width * 2, height: height * 2 })
    expect(imageId).toBe(symbolRegistry.getSymbolImageId(style, mapStyle, 'normal', 2))
  })

  it('gives each variant its own id, the same one rasterising it gives, without rasterising', async () => {
    const style = { symbol: 'pin' }
    const variants = ['normal', 'active', 'selected']
    rasteriseToImageData.mockClear()
    const ids = variants.map((variant) => symbolRegistry.getSymbolImageId(style, mapStyle, variant, 2))
    expect(rasteriseToImageData).not.toHaveBeenCalled()
    expect(new Set(ids).size).toBe(variants.length)
    for (const [index, variant] of variants.entries()) {
      const { imageId } = await symbolRegistry.rasteriseSymbolImage(style, mapStyle, variant, 2)
      expect(imageId).toBe(ids[index])
    }
  })

  it('rasterises nothing for an unknown symbol', async () => {
    await expect(symbolRegistry.rasteriseSymbolImage({ symbol: 'does-not-exist' }, mapStyle, 'normal', 2)).resolves.toBeNull()
  })

  it('treats an unrecognised variant as normal', () => {
    const style = { symbol: 'pin' }
    expect(symbolRegistry.getSymbolImageId(style, mapStyle, 'unknown', 2)).toBe(symbolRegistry.getSymbolImageId(style, mapStyle, 'normal', 2))
  })

  it('shares one rasterisation between callers asking for the same image at once', async () => {
    const style = { symbol: 'hexagon', symbolSize: 'small' }
    rasteriseToImageData.mockClear()
    const [first, second] = await Promise.all([
      symbolRegistry.rasteriseSymbolImage(style, mapStyle, 'normal', 11),
      symbolRegistry.rasteriseSymbolImage(style, mapStyle, 'normal', 11)
    ])
    expect(rasteriseToImageData).toHaveBeenCalledTimes(1)
    expect(second.imageData).toBe(first.imageData)
  })

  it('tries again after a failed rasterisation, rather than sharing the failure', async () => {
    const style = { symbol: 'diamond', symbolSize: 'small' }
    rasteriseToImageData.mockRejectedValueOnce(new Error('image failed to load'))
    await expect(symbolRegistry.rasteriseSymbolImage(style, mapStyle, 'normal', 13)).rejects.toThrow('image failed to load')
    await expect(symbolRegistry.rasteriseSymbolImage(style, mapStyle, 'normal', 13)).resolves.toEqual(expect.objectContaining({ imageData: expect.any(Object) }))
  })

  it('gives image ids a long (about 64-bit) hash', () => {
    const imageId = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, 'normal', 2)
    const [, hash] = imageId.match(/^symbol-([a-z0-9]+)-2x$/)
    expect(hash.length).toBeGreaterThanOrEqual(10) // NOSONAR S109 — two base-36 32-bit hashes
  })

  it('reuses a cached image, but drops the least recently used once the cache is full', async () => {
    const colour = (i) => ({ symbol: 'circle', symbolBackgroundColor: `#${i.toString(16).padStart(6, '0')}` })
    await symbolRegistry.rasteriseSymbolImage(colour(0), mapStyle, 'normal', 1)
    rasteriseToImageData.mockClear()
    await symbolRegistry.rasteriseSymbolImage(colour(0), mapStyle, 'normal', 1)
    expect(rasteriseToImageData).not.toHaveBeenCalled()

    for (let i = 1; i <= 256; i++) { // NOSONAR — fills the 256-entry cache, pushing colour(0) out
      await symbolRegistry.rasteriseSymbolImage(colour(i), mapStyle, 'normal', 1)
    }
    rasteriseToImageData.mockClear()
    await symbolRegistry.rasteriseSymbolImage(colour(0), mapStyle, 'normal', 1)
    expect(rasteriseToImageData).toHaveBeenCalledTimes(1)
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
    expect(resolved).toContain('translate(22, 20) scale(0.8) translate(-8, -8)')
  })
})

// ─── getSymbolDef ─────────────────────────────────────────────────────────────

describe('getSymbolDef', () => {
  it('returns undefined when dataset has no symbol', () => {
    expect(symbolRegistry.getSymbolDef({})).toBeUndefined()
  })

  it('looks up string symbol id in the registry, sized for rendering', () => {
    const sized = symbolRegistry.getSymbolDef({ symbol: 'pin' })
    expect(sized).toMatchObject({ id: 'pin', path: pin.path, scale: 1 })
    expect(sized.viewBox).toBeDefined()
  })

  it('returns the same sized def for the same symbol and size', () => {
    expect(symbolRegistry.getSymbolDef({ symbol: 'pin', symbolSize: 'large' }))
      .toBe(symbolRegistry.getSymbolDef({ symbol: 'pin', symbolSize: 'large' }))
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
    expect(symbolRegistry.getSymbolImageId({}, mapStyle, 'normal', 2)).toBeNull()
  })

  it('returns null for an unregistered symbol id', () => {
    expect(symbolRegistry.getSymbolImageId({ symbol: 'does-not-exist' }, mapStyle, 'normal', 2)).toBeNull()
  })

  it('returns a string prefixed symbol- for normal state', () => {
    const id = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, 'normal', 2)
    expect(typeof id).toBe('string')
    expect(id).toMatch(/^symbol-[a-z0-9]+-\d+(\.\d+)?x$/)
  })

  it('returns a string prefixed symbol-act- for active state', () => {
    const id = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, 'active', 2)
    expect(typeof id).toBe('string')
    expect(id).toMatch(/^symbol-act-[a-z0-9]+-\d+(\.\d+)?x$/)
  })

  it('normal and active ids differ for the same dataset', () => {
    const normalId = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, 'normal', 2)
    const activeId = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, 'active', 2)
    expect(normalId).not.toBe(activeId)
  })

  it('same dataset and style always produces the same id', () => {
    const id1 = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, 'normal', 2)
    const id2 = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, 'normal', 2)
    expect(id1).toBe(id2)
  })

  it('different symbols produce different ids', () => {
    const pinId = symbolRegistry.getSymbolImageId({ symbol: 'pin' }, mapStyle, 'normal', 2)
    const circleId = symbolRegistry.getSymbolImageId({ symbol: 'circle' }, mapStyle, 'normal', 2)
    expect(pinId).not.toBe(circleId)
  })

  it('different backgrounds produce different ids', () => {
    const redId = symbolRegistry.getSymbolImageId({ symbol: 'pin', symbolBackgroundColor: '#ff0000' }, mapStyle, 'normal', 2)
    const blueId = symbolRegistry.getSymbolImageId({ symbol: 'pin', symbolBackgroundColor: '#0000ff' }, mapStyle, 'normal', 2)
    expect(redId).not.toBe(blueId)
  })

  it('resolves inline symbolSvgContent', () => {
    const dataset = {
      symbolSvgContent: '<circle cx="19" cy="19" r="12" fill="{{backgroundColor}}"/>',
      symbolViewBox: '0 0 38 38',
      symbolAnchor: [0.5, 0.5]
    }
    const id = symbolRegistry.getSymbolImageId(dataset, mapStyle, 'normal', 2)
    expect(id).toMatch(/^symbol-[a-z0-9]+-\d+(\.\d+)?x$/)
  })
})
