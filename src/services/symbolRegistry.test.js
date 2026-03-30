import { symbolRegistry } from './symbolRegistry.js'
import { symbolDefaults } from '../symbols/symbolDefaults.js'

describe('symbolRegistry — built-in symbols', () => {
  it('registers pin by default', () => {
    const pin = symbolRegistry.get('pin')
    expect(pin).toBeDefined()
    expect(pin.id).toBe('pin')
    expect(pin.anchor).toEqual([0.5, 1])
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

describe('symbolRegistry — resolve', () => {
  const symbolDef = {
    id: 'test',
    svg: '<path fill="{{background}}" stroke="{{halo}}" stroke-width="{{haloWidth}}"/><path fill="{{foreground}}"/>'
  }

  it('injects default token values when no overrides given', () => {
    const resolved = symbolRegistry.resolve(symbolDef, {}, 'outdoor')
    expect(resolved).toContain(`fill="${symbolDefaults.background}"`)
    expect(resolved).toContain(`fill="${symbolDefaults.foreground}"`)
    expect(resolved).toContain(`stroke-width="${symbolDefaults.haloWidth}"`)
  })

  it('resolves style-keyed halo color for outdoor', () => {
    const resolved = symbolRegistry.resolve(symbolDef, {}, 'outdoor')
    expect(resolved).toContain(`stroke="${symbolDefaults.halo.outdoor}"`)
  })

  it('resolves style-keyed halo color for dark', () => {
    const resolved = symbolRegistry.resolve(symbolDef, {}, 'dark')
    expect(resolved).toContain(`stroke="${symbolDefaults.halo.dark}"`)
  })

  it('overrides default background with a plain string', () => {
    const resolved = symbolRegistry.resolve(symbolDef, { background: '#ff0000' }, 'outdoor')
    expect(resolved).toContain('fill="#ff0000"')
  })

  it('overrides default with a style-keyed color', () => {
    const resolved = symbolRegistry.resolve(symbolDef, { background: { outdoor: '#aabbcc', dark: '#112233' } }, 'outdoor')
    expect(resolved).toContain('fill="#aabbcc"')
  })

  it('ignores null override values — defaults are preserved', () => {
    const resolved = symbolRegistry.resolve(symbolDef, { background: null }, 'outdoor')
    expect(resolved).toContain(`fill="${symbolDefaults.background}"`)
  })

  it('replaces custom tokens not in defaults', () => {
    const customDef = { id: 'custom', svg: '<path fill="{{accentColor}}"/>' }
    const resolved = symbolRegistry.resolve(customDef, { accentColor: '#123456' }, 'outdoor')
    expect(resolved).toContain('fill="#123456"')
  })

  it('replaces selectedWidth token', () => {
    const def = { id: 'sw', svg: '<path stroke-width="{{selectedWidth}}"/>' }
    const resolved = symbolRegistry.resolve(def, { selectedWidth: '10' }, 'outdoor')
    expect(resolved).toContain('stroke-width="10"')
  })

  it('handles null styleColors — uses all defaults', () => {
    const resolved = symbolRegistry.resolve(symbolDef, null, 'outdoor')
    expect(resolved).toContain(`fill="${symbolDefaults.background}"`)
    expect(resolved).toContain(`fill="${symbolDefaults.foreground}"`)
  })

  it('replaces token with empty string when override is an empty string', () => {
    const def = { id: 'es', svg: '<path fill="{{background}}"/>' }
    const resolved = symbolRegistry.resolve(def, { background: '' }, 'outdoor')
    expect(resolved).toContain('fill=""')
  })
})
