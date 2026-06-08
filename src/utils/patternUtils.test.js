import {
  hashString,
  injectColors,
  hasPattern
} from './patternUtils.js'

describe('hashString', () => {
  test('returns a non-empty string', () => {
    expect(typeof hashString('hello')).toBe('string')
    expect(hashString('hello').length).toBeGreaterThan(0)
  })

  test('is deterministic', () => {
    expect(hashString('hello')).toBe(hashString('hello'))
  })

  it('returns the same hash for the same input', () => {
    expect(hashString('https://tiles.example.com/{z}/{x}/{y}'))
      .toBe(hashString('https://tiles.example.com/{z}/{x}/{y}'))
  })

  test('produces different values for different inputs', () => {
    expect(hashString('a')).not.toBe(hashString('b'))
  })

  it('handles an empty string without throwing', () => {
    expect(() => hashString('')).not.toThrow()
  })
})

describe('injectColors', () => {
  test('replaces {{foregroundColor}} and {{backgroundColor}} tokens', () => {
    const result = injectColors('fill="{{foregroundColor}}" bg="{{backgroundColor}}"', 'red', 'blue')
    expect(result).toBe('fill="red" bg="blue"')
  })

  test('replaces all occurrences', () => {
    const result = injectColors('{{foregroundColor}} {{foregroundColor}}', 'red', 'blue')
    expect(result).toBe('red red')
  })

  test('uses fallback "black" when foregroundColor is falsy', () => {
    expect(injectColors('{{foregroundColor}}', '', 'blue')).toBe('black')
  })

  test('uses fallback "transparent" when backgroundColor is falsy', () => {
    expect(injectColors('{{backgroundColor}}', 'red', '')).toBe('transparent')
  })
})

describe('hasPattern', () => {
  test('returns true when fillPattern is set', () => {
    expect(hasPattern({ fillPattern: 'dot' })).toBe(true)
  })

  test('returns true when fillPatternSvgContent is set', () => {
    expect(hasPattern({ fillPatternSvgContent: '<path/>' })).toBe(true)
  })

  test('returns false when neither is set', () => {
    expect(hasPattern({})).toBe(false)
    expect(hasPattern({ fill: 'red' })).toBe(false)
  })
})
