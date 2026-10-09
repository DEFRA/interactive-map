import {
  hasSymbol,
  isStandaloneLabel,
  getSymbolStyleColors,
  getSymbolScale
} from './symbolUtils.js'
import { logger } from '../services/logger.js'

jest.mock('../services/logger.js', () => ({ logger: { warn: jest.fn() } }))

// ─── hasSymbol ────────────────────────────────────────────────────────────────

describe('hasSymbol', () => {
  it('returns true when dataset has a symbol string', () => {
    expect(hasSymbol({ symbol: 'pin' })).toBe(true)
  })

  it('returns true when dataset has symbolSvgContent', () => {
    expect(hasSymbol({ symbolSvgContent: '<circle/>' })).toBe(true)
  })

  it('returns false with no style at all', () => {
    expect(hasSymbol(undefined)).toBe(false)
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

  it('returns false when marker has svgContent (line 28)', () => {
    expect(isStandaloneLabel({ label: 'My label', svgContent: '<circle/>' })).toBe(false)
  })

  it('returns false when label is present but both symbol and svgContent are undefined (line 31)', () => {
    expect(isStandaloneLabel({ label: 'My label' })).toBe(false)
  })

  it('returns true when label is present and symbol is explicitly null (line 31)', () => {
    expect(isStandaloneLabel({ label: 'My label', symbol: null })).toBe(true)
  })

  it('returns true when label is present and svgContent is explicitly null (line 31)', () => {
    expect(isStandaloneLabel({ label: 'My label', svgContent: null })).toBe(true)
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

// ─── getSymbolScale ───────────────────────────────────────────────────────────

describe('getSymbolScale', () => {
  it.each([['small', 0.75], ['medium', 1], ['large', 1.25]])('maps %s to %s', (size, scale) => {
    expect(getSymbolScale(size)).toBe(scale)
  })

  it('treats a missing size as medium, without a warning', () => {
    expect(getSymbolScale(undefined)).toBe(1)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('warns once about an unknown size, and treats it as medium', () => {
    expect(getSymbolScale('huge')).toBe(1)
    expect(getSymbolScale('huge')).toBe(1)
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown symbol size "huge"'))
  })

  it('doesn\'t mistake inherited object keys for sizes', () => {
    expect(getSymbolScale('toString')).toBe(1)
  })
})
