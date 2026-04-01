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

  it('returns true when dataset has symbolSvgContent', () => {
    expect(hasSymbol({ symbolSvgContent: '<circle/>' })).toBe(true)
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

  it('returns inline def from symbolSvgContent with svg key', () => {
    const dataset = { symbolSvgContent: '<circle/>', symbolViewBox: '0 0 10 10' }
    const result = getSymbolDef(dataset, mockRegistry())
    expect(result.svg).toBe('<circle/>')
  })

  it('symbolSvgContent takes precedence over symbol id', () => {
    const pinDef = { id: 'pin', svg: '<g/>' }
    const registry = mockRegistry({ pin: pinDef })
    const result = getSymbolDef({ symbol: 'pin', symbolSvgContent: '<circle/>' }, registry)
    expect(result.svg).toBe('<circle/>')
  })
})

// ─── getSymbolStyleColors ─────────────────────────────────────────────────────

describe('getSymbolStyleColors', () => {
  it('returns empty object when dataset has no symbol', () => {
    expect(getSymbolStyleColors({})).toEqual({})
  })

  it('returns empty object for string symbol with no token props', () => {
    expect(getSymbolStyleColors({ symbol: 'pin' })).toEqual({})
  })

  it('strips symbol prefix from token props', () => {
    const dataset = {
      symbol: 'pin',
      symbolBackgroundColor: '#ff0000',
      symbolForegroundColor: '#ffffff',
      symbolHaloWidth: '2',
      symbolGraphic: 'cross'
    }
    expect(getSymbolStyleColors(dataset)).toEqual({
      backgroundColor: '#ff0000',
      foregroundColor: '#ffffff',
      haloWidth: '2',
      graphic: 'cross'
    })
  })

  it('works with symbolSvgContent instead of symbol id', () => {
    const dataset = { symbolSvgContent: '<circle/>', symbolBackgroundColor: '#0000ff' }
    expect(getSymbolStyleColors(dataset)).toEqual({ backgroundColor: '#0000ff' })
  })

  it('omits token props that are null or undefined', () => {
    const dataset = { symbol: 'pin', symbolBackgroundColor: '#ff0000', symbolForegroundColor: null }
    const result = getSymbolStyleColors(dataset)
    expect(result).toEqual({ backgroundColor: '#ff0000' })
    expect(result).not.toHaveProperty('foregroundColor')
  })

  it('supports style-keyed colour objects', () => {
    const dataset = {
      symbol: 'pin',
      symbolBackgroundColor: { outdoor: '#1d70b8', dark: '#5694ca' }
    }
    expect(getSymbolStyleColors(dataset)).toEqual({
      backgroundColor: { outdoor: '#1d70b8', dark: '#5694ca' }
    })
  })
})

// ─── getSymbolViewBox ─────────────────────────────────────────────────────────

describe('getSymbolViewBox', () => {
  it('returns symbolViewBox from dataset', () => {
    const dataset = { symbol: 'custom', symbolViewBox: '0 0 24 24' }
    expect(getSymbolViewBox(dataset, undefined)).toBe('0 0 24 24')
  })

  it('falls back to symbolDef viewBox', () => {
    const symbolDef = { id: 'pin', viewBox: '0 0 38 38' }
    expect(getSymbolViewBox({ symbol: 'pin' }, symbolDef)).toBe('0 0 38 38')
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
  it('returns symbolAnchor from dataset', () => {
    const dataset = { symbol: 'custom', symbolAnchor: [0.5, 0.9] }
    expect(getSymbolAnchor(dataset, undefined)).toEqual([0.5, 0.9])
  })

  it('falls back to symbolDef anchor', () => {
    const symbolDef = { id: 'pin', anchor: [0.5, 0.9] }
    expect(getSymbolAnchor({ symbol: 'pin' }, symbolDef)).toEqual([0.5, 0.9])
  })

  it('returns default [0.5, 0.5] when neither source has an anchor', () => {
    expect(getSymbolAnchor({ symbol: 'pin' }, {})).toEqual([0.5, 0.5])
  })

  it('returns default [0.5, 0.5] when symbolDef is undefined', () => {
    expect(getSymbolAnchor({ symbol: 'pin' }, undefined)).toEqual([0.5, 0.5])
  })
})
