import { stripInternalSymbolProperties } from './stripInternalSymbolProperties.js'

describe('stripInternalSymbolProperties', () => {
  test('drops adapter-derived symbol* keys not in SYMBOL_KEYS', () => {
    const feature = {
      id: 'a',
      properties: {
        symbol: 'pin',
        symbolBackgroundColor: '#ca3535',
        symbolImageId: 'symbol-abc-2x',
        symbolIconAnchor: 'bottom',
        symbolIconOffset: [0, -10],
        symbolPixelRatio: 2,
        symbolActiveImageId: 'symbol-act-abc-2x',
        symbolSelectedImageId: 'symbol-sel-abc-2x'
      }
    }

    expect(stripInternalSymbolProperties(feature)).toEqual({
      id: 'a',
      properties: { symbol: 'pin', symbolBackgroundColor: '#ca3535' }
    })
  })

  test('leaves non-symbol-prefixed properties untouched', () => {
    const feature = { id: 'a', properties: { label: 'My point', stroke: '#1d70b8' } }
    expect(stripInternalSymbolProperties(feature)).toEqual(feature)
  })

  test('does not mutate the original feature', () => {
    const feature = { id: 'a', properties: { symbol: 'pin', symbolImageId: 'x' } }
    stripInternalSymbolProperties(feature)
    expect(feature.properties.symbolImageId).toBe('x')
  })

  test('returns the feature unchanged when it has no properties', () => {
    const feature = { id: 'a', geometry: { type: 'Point', coordinates: [0, 0] } }
    expect(stripInternalSymbolProperties(feature)).toBe(feature)
  })

  test('returns null/undefined as-is', () => {
    expect(stripInternalSymbolProperties(null)).toBeNull()
    expect(stripInternalSymbolProperties(undefined)).toBeUndefined()
  })
})
