import {
  hashString,
  injectColors,
  hasPattern,
  getPatternInnerContent,
  getPatternImageId,
  getKeyPatternPaths,
  KEY_BORDER_PATH
} from './patternUtils.js'

const mockRegistry = {
  get: (id) => id === 'dot' ? { id: 'dot', svgContent: '<path d="M4 4" fill="{{foregroundColor}}"/>' } : undefined
}

describe('hashString', () => {
  test('returns a non-empty string', () => {
    expect(typeof hashString('hello')).toBe('string')
    expect(hashString('hello').length).toBeGreaterThan(0)
  })

  test('is deterministic', () => {
    expect(hashString('hello')).toBe(hashString('hello'))
  })

  test('produces different values for different inputs', () => {
    expect(hashString('a')).not.toBe(hashString('b'))
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

describe('getPatternInnerContent', () => {
  test('returns fillPatternSvgContent when set (inline SVG takes precedence)', () => {
    const dataset = { fillPatternSvgContent: '<path d="custom"/>', fillPattern: 'dot' }
    expect(getPatternInnerContent(dataset, mockRegistry)).toBe('<path d="custom"/>')
  })

  test('returns svgContent from registry for a named fillPattern', () => {
    const dataset = { fillPattern: 'dot' }
    expect(getPatternInnerContent(dataset, mockRegistry)).toBe('<path d="M4 4" fill="{{foregroundColor}}"/>')
  })

  test('returns null for an unregistered fillPattern name', () => {
    const dataset = { fillPattern: 'unknown-pattern' }
    expect(getPatternInnerContent(dataset, mockRegistry)).toBeNull()
  })

  test('returns null when no pattern is configured', () => {
    expect(getPatternInnerContent({}, mockRegistry)).toBeNull()
  })
})

describe('getPatternImageId', () => {
  test('returns a deterministic string id', () => {
    const dataset = { fillPattern: 'dot', fillPatternForegroundColor: 'red', fillPatternBackgroundColor: 'blue' }
    const id = getPatternImageId(dataset, 'style-a', mockRegistry)
    expect(typeof id).toBe('string')
    expect(id).toMatch(/^pattern-/)
    expect(id).toBe(getPatternImageId(dataset, 'style-a', mockRegistry))
  })

  test('returns null when no pattern content is found', () => {
    expect(getPatternImageId({ fillPattern: 'unknown' }, 'style-a', mockRegistry)).toBeNull()
  })

  test('produces different ids for different colours', () => {
    const base = { fillPattern: 'dot' }
    const idA = getPatternImageId({ ...base, fillPatternForegroundColor: 'red' }, 'style-a', mockRegistry)
    const idB = getPatternImageId({ ...base, fillPatternForegroundColor: 'blue' }, 'style-a', mockRegistry)
    expect(idA).not.toBe(idB)
  })

  test('falls back to "black" foreground and "transparent" background when colours are absent', () => {
    const id = getPatternImageId({ fillPattern: 'dot' }, 'style-a', mockRegistry)
    const idExplicit = getPatternImageId(
      { fillPattern: 'dot', fillPatternForegroundColor: 'black', fillPatternBackgroundColor: 'transparent' },
      'style-a',
      mockRegistry
    )
    expect(id).toBe(idExplicit)
  })
})

describe('getKeyPatternPaths', () => {
  test('returns border and content strings with colours injected', () => {
    const dataset = {
      fillPattern: 'dot',
      fillPatternForegroundColor: 'red',
      fillPatternBackgroundColor: 'white',
      stroke: 'black'
    }
    const result = getKeyPatternPaths(dataset, 'style-a', mockRegistry)
    expect(result).not.toBeNull()
    expect(result.border).toContain('black') // stroke colour
    expect(result.border).toContain('white') // background colour
    expect(result.content).toContain('red') // foreground colour
    expect(result.border).not.toContain('{{foregroundColor}}')
    expect(result.content).not.toContain('{{foregroundColor}}')
  })

  test('returns null when no pattern content is found', () => {
    expect(getKeyPatternPaths({ fillPattern: 'unknown' }, 'style-a', mockRegistry)).toBeNull()
  })

  test('falls back to "black" fg and "transparent" bg when colour properties are absent', () => {
    const result = getKeyPatternPaths({ fillPattern: 'dot' }, 'style-a', mockRegistry)
    expect(result).not.toBeNull()
    expect(result.content).toContain('black')
    expect(result.border).toContain('transparent')
  })

  test('border stroke falls back to foreground colour when stroke is absent', () => {
    const result = getKeyPatternPaths(
      { fillPattern: 'dot', fillPatternForegroundColor: 'green' },
      'style-a',
      mockRegistry
    )
    expect(result).not.toBeNull()
    // borderStroke falls back to fg ('green'), so the border uses green for both stroke and background
    expect(result.border).toContain('green')
  })

  test('KEY_BORDER_PATH contains foregroundColor and backgroundColor tokens', () => {
    expect(KEY_BORDER_PATH).toContain('{{foregroundColor}}')
    expect(KEY_BORDER_PATH).toContain('{{backgroundColor}}')
  })
})
