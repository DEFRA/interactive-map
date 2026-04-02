import { symbolRegistry } from './symbolRegistry.js'
import { symbolDefaults } from '../config/symbolConfig.js'
import { SCHEME_COLORS } from '../config/mapTheme.js'
import { getValueForStyle } from '../utils/getValueForStyle.js'

const STYLE_ID = 'test'
const mapStyle = { id: STYLE_ID }

beforeEach(() => {
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
    symbolRegistry.setDefaults({ backgroundColor: '#ff0000', symbol: 'circle' })
    const defaults = symbolRegistry.getDefaults()
    expect(defaults.backgroundColor).toBe('#ff0000')
    expect(defaults.symbol).toBe('circle')
  })

  it('constructor defaults do not affect unset properties', () => {
    symbolRegistry.setDefaults({ backgroundColor: '#ff0000' })
    const defaults = symbolRegistry.getDefaults()
    expect(defaults.foregroundColor).toBe(symbolDefaults.foregroundColor)
  })

  it('setDefaults with null or undefined resets to hardcoded defaults', () => {
    symbolRegistry.setDefaults({ backgroundColor: '#ff0000' })
    symbolRegistry.setDefaults(null)
    expect(symbolRegistry.getDefaults().backgroundColor).toBe(symbolDefaults.backgroundColor)
  })
})

describe('symbolRegistry — resolve', () => {
  const BACKGROUND_SVG = '<path fill="{{backgroundColor}}"/>'
  const symbolDef = {
    id: 'test',
    svg: '<path fill="{{backgroundColor}}" stroke="{{haloColor}}" stroke-width="{{haloWidth}}"/><path fill="{{foregroundColor}}" stroke="{{selectedColor}}"/>'
  }

  it('injects default token values when no overrides given', () => {
    const resolved = symbolRegistry.resolve(symbolDef, {}, mapStyle)
    expect(resolved).toContain(`fill="${getValueForStyle(symbolDefaults.backgroundColor, STYLE_ID)}"`)
    expect(resolved).toContain(`fill="${getValueForStyle(symbolDefaults.foregroundColor, STYLE_ID)}"`)
    expect(resolved).toContain(`stroke-width="${symbolDefaults.haloWidth}"`)
  })

  it('always produces empty selectedColor token — ring is hidden', () => {
    const resolved = symbolRegistry.resolve(symbolDef, {}, mapStyle)
    expect(resolved).toContain('stroke=""')
  })

  it('uses light scheme haloColor when mapStyle has no haloColor', () => {
    const resolved = symbolRegistry.resolve(symbolDef, {}, mapStyle)
    expect(resolved).toContain(`stroke="${SCHEME_COLORS.light.haloColor}"`)
  })

  it('uses mapStyle.haloColor when provided', () => {
    const resolved = symbolRegistry.resolve(symbolDef, {}, { id: STYLE_ID, haloColor: '#336699' })
    expect(resolved).toContain('stroke="#336699"')
  })

  it('overrides default backgroundColor with a plain string', () => {
    const resolved = symbolRegistry.resolve(symbolDef, { backgroundColor: '#ff0000' }, mapStyle)
    expect(resolved).toContain('fill="#ff0000"')
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

describe('symbolRegistry — resolveSelected', () => {
  const symbolDef = {
    id: 'test-sel',
    svg: '<path stroke="{{selectedColor}}" stroke-width="{{selectedWidth}}"/><path fill="{{backgroundColor}}"/>'
  }

  it('uses light scheme selectedColor when mapStyle has no selectedColor', () => {
    const resolved = symbolRegistry.resolveSelected(symbolDef, {}, mapStyle)
    expect(resolved).toContain(`stroke="${SCHEME_COLORS.light.selectedColor}"`)
  })

  it('uses mapStyle.selectedColor when provided', () => {
    const resolved = symbolRegistry.resolveSelected(symbolDef, {}, { id: STYLE_ID, selectedColor: '#ff0000' })
    expect(resolved).toContain('stroke="#ff0000"')
  })

  it('uses selectedWidth from symbolDefaults', () => {
    const resolved = symbolRegistry.resolveSelected(symbolDef, {}, mapStyle)
    expect(resolved).toContain(`stroke-width="${symbolDefaults.selectedWidth}"`)
  })

  it('handles null styleColors — uses cascade defaults', () => {
    const resolved = symbolRegistry.resolveSelected(symbolDef, null, mapStyle)
    expect(resolved).toContain(`stroke="${SCHEME_COLORS.light.selectedColor}"`)
  })

  it('returns empty string for null symbolDef', () => {
    expect(symbolRegistry.resolveSelected(null, {}, mapStyle)).toBe('')
  })

  it('symbol-level selectedColor is ignored — mapStyle wins', () => {
    const defWithSelected = { ...symbolDef, selectedColor: '#00ff00' }
    const resolved = symbolRegistry.resolveSelected(defWithSelected, {}, { id: STYLE_ID, selectedColor: '#ff0000' })
    expect(resolved).toContain('stroke="#ff0000"')
  })

  it('still resolves other tokens correctly', () => {
    const resolved = symbolRegistry.resolveSelected(symbolDef, { backgroundColor: '#d4351c' }, mapStyle)
    expect(resolved).toContain('fill="#d4351c"')
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
    expect(resolved).toContain('translate(19, 16) scale(0.8) translate(-8, -8)')
  })
})
