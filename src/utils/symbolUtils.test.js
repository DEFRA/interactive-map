import {
  hasSymbol,
  getSymbolDef,
  getSymbolStyleColors,
  getSymbolViewBox,
  getSymbolAnchor
} from './symbolUtils.js'

const mockRegistry = (defs = {}) => ({
  get: jest.fn((id) => defs[id])
})

// ─── hasSymbol ────────────────────────────────────────────────────────────────

describe('hasSymbol', () => {
  it('returns true when dataset has a symbol string', () => {
    expect(hasSymbol({ symbol: 'pin' })).toBe(true)
  })

  it('returns true when dataset has an object-form symbol', () => {
    expect(hasSymbol({ symbol: { id: 'pin' } })).toBe(true)
  })

  it('returns false when symbol is absent', () => {
    expect(hasSymbol({})).toBe(false)
  })

  it('returns false when symbol is null', () => {
    expect(hasSymbol({ symbol: null })).toBe(false)
  })
})

// ─── getSymbolDef ─────────────────────────────────────────────────────────────

describe('getSymbolDef', () => {
  it('returns undefined when dataset has no symbol', () => {
    expect(getSymbolDef({}, mockRegistry())).toBeUndefined()
  })

  it('looks up string symbol id in the registry', () => {
    const pinDef = { id: 'pin', svg: '<g/>' }
    const registry = mockRegistry({ pin: pinDef })
    expect(getSymbolDef({ symbol: 'pin' }, registry)).toBe(pinDef)
  })

  it('returns undefined for an unregistered string symbol', () => {
    expect(getSymbolDef({ symbol: 'missing' }, mockRegistry())).toBeUndefined()
  })

  it('returns inline def from symbolSvgContent with svg key added', () => {
    const symbol = { symbolSvgContent: '<circle/>', viewBox: '0 0 10 10', anchor: [0.5, 0.5] }
    const result = getSymbolDef({ symbol }, mockRegistry())
    expect(result.svg).toBe('<circle/>')
    expect(result.viewBox).toBe('0 0 10 10')
  })

  it('looks up object-form symbol by id', () => {
    const circleDef = { id: 'circle', svg: '<circle/>' }
    const registry = mockRegistry({ circle: circleDef })
    expect(getSymbolDef({ symbol: { id: 'circle' } }, registry)).toBe(circleDef)
  })

  it('returns undefined for object-form symbol with neither symbolSvgContent nor id', () => {
    expect(getSymbolDef({ symbol: { viewBox: '0 0 10 10' } }, mockRegistry())).toBeUndefined()
  })
})

// ─── getSymbolStyleColors ─────────────────────────────────────────────────────

describe('getSymbolStyleColors', () => {
  it('returns empty object when dataset has no symbol', () => {
    expect(getSymbolStyleColors({})).toEqual({})
  })

  it('returns empty object for string symbol with no top-level tokens', () => {
    expect(getSymbolStyleColors({ symbol: 'pin' })).toEqual({})
  })

  it('extracts top-level graphic token for string symbol', () => {
    expect(getSymbolStyleColors({ symbol: 'pin', graphic: 'cross' })).toEqual({ graphic: 'cross' })
  })

  it('excludes structural keys from object-form symbol', () => {
    const symbol = { id: 'pin', symbolSvgContent: '<g/>', viewBox: '0 0 38 38', anchor: [0.5, 0.5] }
    expect(getSymbolStyleColors({ symbol })).toEqual({})
  })

  it('extracts token overrides from object-form symbol', () => {
    const symbol = { id: 'pin', background: '#ff0000', foreground: '#ffffff' }
    const result = getSymbolStyleColors({ symbol })
    expect(result.background).toBe('#ff0000')
    expect(result.foreground).toBe('#ffffff')
    expect(result).not.toHaveProperty('id')
  })

  it('merges top-level graphic with object-form symbol tokens', () => {
    const symbol = { id: 'pin', background: '#ff0000' }
    expect(getSymbolStyleColors({ symbol, graphic: 'dot' })).toEqual({ background: '#ff0000', graphic: 'dot' })
  })
})

// ─── getSymbolViewBox ─────────────────────────────────────────────────────────

describe('getSymbolViewBox', () => {
  it('returns viewBox from object-form symbol config', () => {
    const dataset = { symbol: { id: 'custom', viewBox: '0 0 24 24' } }
    expect(getSymbolViewBox(dataset, undefined)).toBe('0 0 24 24')
  })

  it('falls back to symbolDef viewBox when symbol is a string', () => {
    const symbolDef = { id: 'pin', viewBox: '0 0 38 38' }
    expect(getSymbolViewBox({ symbol: 'pin' }, symbolDef)).toBe('0 0 38 38')
  })

  it('falls back to symbolDef viewBox when object-form symbol has no viewBox', () => {
    const symbolDef = { id: 'pin', viewBox: '0 0 38 38' }
    expect(getSymbolViewBox({ symbol: { id: 'pin' } }, symbolDef)).toBe('0 0 38 38')
  })

  it('returns default viewBox when neither source has one', () => {
    expect(getSymbolViewBox({ symbol: 'pin' }, {})).toBe('0 0 38 38')
  })

  it('returns default viewBox when symbolDef is undefined', () => {
    expect(getSymbolViewBox({ symbol: 'pin' }, undefined)).toBe('0 0 38 38')
  })
})

// ─── getSymbolAnchor ──────────────────────────────────────────────────────────

describe('getSymbolAnchor', () => {
  it('returns anchor from object-form symbol config', () => {
    const dataset = { symbol: { id: 'custom', anchor: [0.5, 0.9] } }
    expect(getSymbolAnchor(dataset, undefined)).toEqual([0.5, 0.9])
  })

  it('falls back to symbolDef anchor when symbol is a string', () => {
    const symbolDef = { id: 'pin', anchor: [0.5, 0.9] }
    expect(getSymbolAnchor({ symbol: 'pin' }, symbolDef)).toEqual([0.5, 0.9])
  })

  it('falls back to symbolDef anchor when object-form symbol has no anchor', () => {
    const symbolDef = { anchor: [0.5, 0.5] }
    expect(getSymbolAnchor({ symbol: { id: 'pin' } }, symbolDef)).toEqual([0.5, 0.5])
  })

  it('returns default [0.5, 0.5] when neither source has an anchor', () => {
    expect(getSymbolAnchor({ symbol: 'pin' }, {})).toEqual([0.5, 0.5])
  })

  it('returns default [0.5, 0.5] when symbolDef is undefined', () => {
    expect(getSymbolAnchor({ symbol: 'pin' }, undefined)).toEqual([0.5, 0.5])
  })
})
