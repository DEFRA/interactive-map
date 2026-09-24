import {
  hasSymbol,
  isStandaloneLabel,
  getSymbolStyleColors,
  getSymbolViewBox,
  getSymbolAnchor,
  getSymbolScale
} from './symbolUtils.js'

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

// ─── isStandaloneLabel ────────────────────────────────────────────────────────

describe('isStandaloneLabel', () => {
  it('returns false when marker has no label', () => {
    expect(isStandaloneLabel({})).toBe(false)
    expect(isStandaloneLabel({ symbol: null })).toBe(false)
  })

  it('returns false when marker has a truthy symbol string (line 28)', () => {
    expect(isStandaloneLabel({ label: 'My label', symbol: 'pin' })).toBe(false)
  })

  it('returns false when marker has symbolSvgContent (line 28)', () => {
    expect(isStandaloneLabel({ label: 'My label', symbolSvgContent: '<circle/>' })).toBe(false)
  })

  it('returns false when label is present but both symbol and symbolSvgContent are undefined (line 31)', () => {
    expect(isStandaloneLabel({ label: 'My label' })).toBe(false)
  })

  it('returns true when label is present and symbol is explicitly null (line 31)', () => {
    expect(isStandaloneLabel({ label: 'My label', symbol: null })).toBe(true)
  })

  it('returns true when label is present and symbolSvgContent is explicitly null (line 31)', () => {
    expect(isStandaloneLabel({ label: 'My label', symbolSvgContent: null })).toBe(true)
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
      symbolGraphic: 'cross'
    }
    expect(getSymbolStyleColors(dataset)).toEqual({
      backgroundColor: '#ff0000',
      foregroundColor: '#ffffff',
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
  it('returns symbolViewBox from dataset when there is no symbolDef', () => {
    const dataset = { symbol: 'custom', symbolViewBox: '0 0 24 24' }
    expect(getSymbolViewBox(dataset, undefined)).toBe('0 0 24 24')
  })

  it('prefers the (already sized) symbolDef viewBox over dataset.symbolViewBox', () => {
    const dataset = { symbolSvgContent: '<circle/>', symbolViewBox: '0 0 24 24', symbolSize: 'large' }
    expect(getSymbolViewBox(dataset, { viewBox: '0 0 30 30' })).toBe('0 0 30 30')
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

// ─── getSymbolScale ───────────────────────────────────────────────────────────

describe('getSymbolScale', () => {
  it.each([['small', 0.75], ['medium', 1], ['large', 1.25]])('maps %s to %s', (symbolSize, scale) => {
    expect(getSymbolScale(symbolSize)).toBe(scale)
  })

  it('returns 1 for a missing or unknown size', () => {
    expect(getSymbolScale(undefined)).toBe(1)
    expect(getSymbolScale('huge')).toBe(1)
  })
})
