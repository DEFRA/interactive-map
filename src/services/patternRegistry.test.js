import { patternRegistry } from './patternRegistry.js'

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
})
