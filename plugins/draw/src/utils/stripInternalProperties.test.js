import { stripInternalProperties } from './stripInternalProperties.js'

describe('stripInternalProperties', () => {
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

    expect(stripInternalProperties(feature)).toEqual({
      id: 'a',
      properties: { symbol: 'pin', symbolBackgroundColor: '#ca3535' }
    })
  })

  test('drops the internal sortKey property', () => {
    const feature = { id: 'a', properties: { label: 'My point', sortKey: 3 } }
    expect(stripInternalProperties(feature)).toEqual({ id: 'a', properties: { label: 'My point' } })
  })

  test('leaves non-symbol-prefixed properties untouched', () => {
    const feature = { id: 'a', properties: { label: 'My point', stroke: '#1d70b8' } }
    expect(stripInternalProperties(feature)).toEqual(feature)
  })

  test('does not mutate the original feature', () => {
    const feature = { id: 'a', properties: { symbol: 'pin', symbolImageId: 'x' } }
    stripInternalProperties(feature)
    expect(feature.properties.symbolImageId).toBe('x')
  })

  test('returns the feature unchanged when it has no properties', () => {
    const feature = { id: 'a', geometry: { type: 'Point', coordinates: [0, 0] } }
    expect(stripInternalProperties(feature)).toBe(feature)
  })

  test('returns null/undefined as-is', () => {
    expect(stripInternalProperties(null)).toBeNull()
    expect(stripInternalProperties(undefined)).toBeUndefined()
  })
})
