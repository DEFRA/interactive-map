import { symbolRegistry } from './symbolRegistry.js'
import { symbolDefaults } from '../symbols/symbolDefaults.js'
import { getValueForStyle } from '../utils/getValueForStyle.js'

const OUTDOOR = 'outdoor'

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
      svg: '<rect fill="{{background}}"/>'
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
    expect(defaults.background).toBe(symbolDefaults.background)
  })

  it('constructor defaults override hardcoded defaults', () => {
    symbolRegistry.setDefaults({ background: '#ff0000', symbol: 'circle' })
    const defaults = symbolRegistry.getDefaults()
    expect(defaults.background).toBe('#ff0000')
    expect(defaults.symbol).toBe('circle')
  })

  it('constructor defaults do not affect unset properties', () => {
    symbolRegistry.setDefaults({ background: '#ff0000' })
    const defaults = symbolRegistry.getDefaults()
    expect(defaults.foreground).toBe(symbolDefaults.foreground)
  })

  it('setDefaults with null or undefined resets to hardcoded defaults', () => {
    symbolRegistry.setDefaults({ background: '#ff0000' })
    symbolRegistry.setDefaults(null)
    expect(symbolRegistry.getDefaults().background).toBe(symbolDefaults.background)
  })
})

describe('symbolRegistry — resolve', () => {
  const BACKGROUND_SVG = '<path fill="{{background}}"/>'
  const symbolDef = {
    id: 'test',
    svg: '<path fill="{{background}}" stroke="{{halo}}" stroke-width="{{haloWidth}}"/><path fill="{{foreground}}" stroke="{{selected}}"/>'
  }

  it('injects default token values when no overrides given', () => {
    const resolved = symbolRegistry.resolve(symbolDef, {}, OUTDOOR)
    expect(resolved).toContain(`fill="${getValueForStyle(symbolDefaults.background, OUTDOOR)}"`)
    expect(resolved).toContain(`fill="${getValueForStyle(symbolDefaults.foreground, OUTDOOR)}"`)
    expect(resolved).toContain(`stroke-width="${symbolDefaults.haloWidth}"`)
  })

  it('always produces empty selected token — ring is hidden', () => {
    const resolved = symbolRegistry.resolve(symbolDef, {}, OUTDOOR)
    expect(resolved).toContain('stroke=""')
  })

  it('resolves style-keyed halo color for outdoor', () => {
    const resolved = symbolRegistry.resolve(symbolDef, {}, OUTDOOR)
    expect(resolved).toContain(`stroke="${symbolDefaults.halo.outdoor}"`)
  })

  it('resolves style-keyed halo color for dark', () => {
    const resolved = symbolRegistry.resolve(symbolDef, {}, 'dark')
    expect(resolved).toContain(`stroke="${symbolDefaults.halo.dark}"`)
  })

  it('overrides default background with a plain string', () => {
    const resolved = symbolRegistry.resolve(symbolDef, { background: '#ff0000' }, OUTDOOR)
    expect(resolved).toContain('fill="#ff0000"')
  })

  it('overrides default with a style-keyed color', () => {
    const resolved = symbolRegistry.resolve(symbolDef, { background: { outdoor: '#aabbcc', dark: '#112233' } }, OUTDOOR)
    expect(resolved).toContain('fill="#aabbcc"')
  })

  it('ignores null override values — defaults are preserved', () => {
    const resolved = symbolRegistry.resolve(symbolDef, { background: null }, OUTDOOR)
    expect(resolved).toContain(`fill="${getValueForStyle(symbolDefaults.background, OUTDOOR)}"`)
  })

  it('replaces custom tokens not in defaults', () => {
    const customDef = { id: 'custom', svg: '<path fill="{{accentColor}}"/>' }
    const resolved = symbolRegistry.resolve(customDef, { accentColor: '#123456' }, OUTDOOR)
    expect(resolved).toContain('fill="#123456"')
  })

  it('handles null styleColors — uses all defaults', () => {
    const resolved = symbolRegistry.resolve(symbolDef, null, OUTDOOR)
    expect(resolved).toContain(`fill="${getValueForStyle(symbolDefaults.background, OUTDOOR)}"`)
    expect(resolved).toContain(`fill="${getValueForStyle(symbolDefaults.foreground, OUTDOOR)}"`)
  })

  it('replaces token with empty string when override is an empty string', () => {
    const def = { id: 'es', svg: BACKGROUND_SVG }
    const resolved = symbolRegistry.resolve(def, { background: '' }, OUTDOOR)
    expect(resolved).toContain('fill=""')
  })

  it('returns empty string for null symbolDef', () => {
    expect(symbolRegistry.resolve(null, {}, OUTDOOR)).toBe('')
  })

  it('constructor defaults take precedence over hardcoded defaults', () => {
    symbolRegistry.setDefaults({ background: '#abcdef' })
    const resolved = symbolRegistry.resolve(symbolDef, {}, OUTDOOR)
    expect(resolved).toContain('fill="#abcdef"')
  })

  it('symbol-level token defaults take precedence over constructor defaults', () => {
    symbolRegistry.setDefaults({ background: '#abcdef' })
    const defWithToken = { id: 'td', svg: BACKGROUND_SVG, background: '#111111' }
    const resolved = symbolRegistry.resolve(defWithToken, {}, OUTDOOR)
    expect(resolved).toContain('fill="#111111"')
  })

  it('marker-level overrides take precedence over symbol-level defaults', () => {
    const defWithToken = { id: 'td2', svg: BACKGROUND_SVG, background: '#111111' }
    const resolved = symbolRegistry.resolve(defWithToken, { background: '#ffffff' }, OUTDOOR)
    expect(resolved).toContain('fill="#ffffff"')
  })
})

describe('symbolRegistry — resolveSelected', () => {
  const symbolDef = {
    id: 'test-sel',
    svg: '<path stroke="{{selected}}" stroke-width="{{selectedWidth}}"/><path fill="{{background}}"/>'
  }

  it('uses selected color from symbolDefaults', () => {
    const resolved = symbolRegistry.resolveSelected(symbolDef, {}, OUTDOOR)
    expect(resolved).toContain(`stroke="${getValueForStyle(symbolDefaults.selected, OUTDOOR)}"`)
  })

  it('uses selectedWidth from symbolDefaults', () => {
    const resolved = symbolRegistry.resolveSelected(symbolDef, {}, OUTDOOR)
    expect(resolved).toContain(`stroke-width="${symbolDefaults.selectedWidth}"`)
  })

  it('handles null styleColors — uses cascade defaults', () => {
    const resolved = symbolRegistry.resolveSelected(symbolDef, null, OUTDOOR)
    expect(resolved).toContain(`stroke="${getValueForStyle(symbolDefaults.selected, OUTDOOR)}"`)
  })

  it('returns empty string for null symbolDef', () => {
    expect(symbolRegistry.resolveSelected(null, {}, OUTDOOR)).toBe('')
  })

  it('constructor selected color overrides hardcoded default', () => {
    symbolRegistry.setDefaults({ selected: '#ff0000' })
    const resolved = symbolRegistry.resolveSelected(symbolDef, {}, OUTDOOR)
    expect(resolved).toContain('stroke="#ff0000"')
  })

  it('symbol-level selected color is ignored — constructor default wins', () => {
    symbolRegistry.setDefaults({ selected: '#ff0000' })
    const defWithSelected = { ...symbolDef, selected: '#00ff00' }
    const resolved = symbolRegistry.resolveSelected(defWithSelected, {}, OUTDOOR)
    expect(resolved).toContain('stroke="#ff0000"')
  })

  it('resolves style-keyed selected color', () => {
    symbolRegistry.setDefaults({ selected: { outdoor: '#ffdd00', dark: '#ffaa00' } })
    const resolved = symbolRegistry.resolveSelected(symbolDef, {}, 'dark')
    expect(resolved).toContain('stroke="#ffaa00"')
  })

  it('still resolves other tokens correctly', () => {
    const resolved = symbolRegistry.resolveSelected(symbolDef, { background: '#d4351c' }, OUTDOOR)
    expect(resolved).toContain('fill="#d4351c"')
  })
})

describe('symbolRegistry — graphic token', () => {
  const graphicDef = {
    id: 'test-graphic',
    graphic: 'M10 10 L20 20',
    svg: '<path d="{{graphic}}" fill="{{foreground}}"/>'
  }

  it('substitutes graphic d attribute from symbol-level default', () => {
    const resolved = symbolRegistry.resolve(graphicDef, {}, OUTDOOR)
    expect(resolved).toContain('d="M10 10 L20 20"')
  })

  it('overrides symbol-level graphic with marker-level value', () => {
    const resolved = symbolRegistry.resolve(graphicDef, { graphic: 'M0 0 L38 38' }, OUTDOOR)
    expect(resolved).toContain('d="M0 0 L38 38"')
  })

  it('overrides graphic via constructor defaults', () => {
    symbolRegistry.setDefaults({ graphic: 'M5 5 L15 15' })
    const defNoGraphic = { id: 'no-graphic', svg: '<path d="{{graphic}}"/>' }
    const resolved = symbolRegistry.resolve(defNoGraphic, {}, OUTDOOR)
    expect(resolved).toContain('d="M5 5 L15 15"')
  })

  it('marker-level graphic overrides constructor default', () => {
    symbolRegistry.setDefaults({ graphic: 'M5 5 L15 15' })
    const defNoGraphic = { id: 'no-graphic2', svg: '<path d="{{graphic}}"/>' }
    const resolved = symbolRegistry.resolve(defNoGraphic, { graphic: 'M1 1 L2 2' }, OUTDOOR)
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
    const resolved = symbolRegistry.resolve(pin, {}, OUTDOOR)
    expect(resolved).toContain(`d="${pin.graphic}"`)
    expect(resolved).toContain('translate(19, 16) scale(0.8) translate(-8, -8)')
  })
})
