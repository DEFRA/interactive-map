import { patternRegistry } from './patternRegistry.js'
import { KEY_BORDER_PATH } from '../utils/patternUtils.js'
describe('patternRegistry', () => {
  describe('built-in patterns', () => {
    test.each([
      'cross-hatch',
      'diagonal-cross-hatch',
      'forward-diagonal-hatch',
      'backward-diagonal-hatch',
      'horizontal-hatch',
      'vertical-hatch',
      'dot',
      'diamond'
    ])('seeds built-in pattern: %s', (id) => {
      const pattern = patternRegistry.get(id)
      expect(pattern).toBeDefined()
      expect(pattern.id).toBe(id)
      expect(typeof pattern.svgContent).toBe('string')
      expect(pattern.svgContent.length).toBeGreaterThan(0)
    })
  })

  describe('register / get', () => {
    test('registers a custom pattern and retrieves it by id', () => {
      patternRegistry.register('test-hatch', '<path d="M0 0L8 8" stroke="{{foreground}}"/>')
      const result = patternRegistry.get('test-hatch')
      expect(result).toEqual({ id: 'test-hatch', svgContent: '<path d="M0 0L8 8" stroke="{{foreground}}"/>' })
    })

    test('returns undefined for an unregistered id', () => {
      expect(patternRegistry.get('nonexistent-pattern')).toBeUndefined()
    })

    test('overwrite an existing pattern by re-registering the same id', () => {
      patternRegistry.register('overwrite-test', '<path d="M0 0"/>')
      patternRegistry.register('overwrite-test', '<path d="M1 1"/>')
      expect(patternRegistry.get('overwrite-test').svgContent).toBe('<path d="M1 1"/>')
    })
  })

  describe('list', () => {
    test('returns all registered patterns including built-ins', () => {
      const all = patternRegistry.list()
      expect(all.length).toBeGreaterThanOrEqual(8)
      expect(all.every(p => p.id && p.svgContent)).toBe(true)
    })
  })

  describe('getPatternInnerContent', () => {
    test('returns fillPatternSvgContent when set (inline SVG takes precedence)', () => {
      const style = { fillPatternSvgContent: '<path d="custom"/>', fillPattern: 'dot' }
      expect(patternRegistry.getPatternInnerContent(style)).toBe('<path d="custom"/>')
    })

    test('returns svgContent from registry for a named fillPattern', () => {
      const style = { fillPattern: 'dot' }
      patternRegistry.register('dot', '<path d="M4 4" fill="{{foregroundColor}}"/>')
      expect(patternRegistry.getPatternInnerContent(style)).toBe('<path d="M4 4" fill="{{foregroundColor}}"/>')
    })

    test('returns null for an unregistered fillPattern name', () => {
      const style = { fillPattern: 'unknown-pattern' }
      expect(patternRegistry.getPatternInnerContent(style)).toBeNull()
    })

    test('returns null when no pattern is configured', () => {
      expect(patternRegistry.getPatternInnerContent({})).toBeNull()
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
      const result = patternRegistry.getKeyPatternPaths(dataset, 'style-a')
      expect(result).not.toBeNull()
      expect(result.border).toContain('black') // stroke colour
      expect(result.border).toContain('white') // background colour
      expect(result.content).toContain('red') // foreground colour
      expect(result.border).not.toContain('{{foregroundColor}}')
      expect(result.content).not.toContain('{{foregroundColor}}')
    })

    test('returns null when no pattern content is found', () => {
      expect(patternRegistry.getKeyPatternPaths({ fillPattern: 'unknown' }, 'style-a')).toBeNull()
    })

    test('falls back to "black" fg and "transparent" bg when colour properties are absent', () => {
      const result = patternRegistry.getKeyPatternPaths({ fillPattern: 'dot' }, 'style-a')
      expect(result).not.toBeNull()
      expect(result.content).toContain('black')
      expect(result.border).toContain('transparent')
    })

    test('border stroke falls back to foreground colour when stroke is absent', () => {
      const result = patternRegistry.getKeyPatternPaths(
        { fillPattern: 'dot', fillPatternForegroundColor: 'green' },
        'style-a'
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

  describe('patternRegistry.getPatternImageId', () => {
    test('returns a deterministic string id', () => {
      const dataset = { fillPattern: 'dot', fillPatternForegroundColor: 'red', fillPatternBackgroundColor: 'blue' }
      const id = patternRegistry.getPatternImageId(dataset, 'style-a')
      expect(typeof id).toBe('string')
      expect(id).toMatch(/^pattern-/)
      expect(id).toBe(patternRegistry.getPatternImageId(dataset, 'style-a'))
    })

    test('returns null when no pattern content is found', () => {
      expect(patternRegistry.getPatternImageId({ fillPattern: 'unknown' }, 'style-a')).toBeNull()
    })

    test('produces different ids for different colours', () => {
      const base = { fillPattern: 'dot' }
      const idA = patternRegistry.getPatternImageId({ ...base, fillPatternForegroundColor: 'red' }, 'style-a')
      const idB = patternRegistry.getPatternImageId({ ...base, fillPatternForegroundColor: 'blue' }, 'style-a')
      expect(idA).not.toBe(idB)
    })

    test('floors effective ratio at PATTERN_MIN_PIXEL_RATIO so low-DPI ids match 2x', () => {
      const dataset = { fillPattern: 'dot' }
      const id1x = patternRegistry.getPatternImageId(dataset, 'style-a', 1)
      const id2x = patternRegistry.getPatternImageId(dataset, 'style-a', 2)
      expect(id1x).toBe(id2x)
      expect(id1x).toMatch(/-2x$/)
    })

    test('produces different ids for pixelRatios above the floor', () => {
      const dataset = { fillPattern: 'dot' }
      const id2x = patternRegistry.getPatternImageId(dataset, 'style-a', 2)
      const id3x = patternRegistry.getPatternImageId(dataset, 'style-a', 3)
      expect(id2x).not.toBe(id3x)
      expect(id2x).toMatch(/-2x$/)
      expect(id3x).toMatch(/-3x$/)
    })

    test('falls back to "black" foreground and "transparent" background when colours are absent', () => {
      const id = patternRegistry.getPatternImageId({ fillPattern: 'dot' }, 'style-a')
      const idExplicit = patternRegistry.getPatternImageId(
        { fillPattern: 'dot', fillPatternForegroundColor: 'black', fillPatternBackgroundColor: 'transparent' },
        'style-a'
      )
      expect(id).toBe(idExplicit)
    })
  })
})
