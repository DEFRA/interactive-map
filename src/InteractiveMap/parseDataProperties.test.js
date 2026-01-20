import { parseDataProperties } from './parseDataProperties.js'

describe('parseDataProperties', () => {
  let el

  beforeEach(() => {
    el = document.createElement('div')
  })

  it('parses JSON string attributes', () => {
    el.dataset.config = '{"foo":"bar"}'
    el.dataset.numbers = '[1,2,3]'

    const result = parseDataProperties(el)

    expect(result.config).toEqual({ foo: 'bar' })
    expect(result.numbers).toEqual([1, 2, 3])
  })

  it('returns plain strings for non-JSON attributes', () => {
    el.dataset.title = 'Hello World'
    el.dataset.id = 'test-123'

    const result = parseDataProperties(el)

    expect(result.title).toBe('Hello World')
    expect(result.id).toBe('test-123')
  })

  it('handles mixed JSON and plain string attributes', () => {
    el.dataset.config = '{"enabled":true}'
    el.dataset.name = 'Component'

    const result = parseDataProperties(el)

    expect(result.config).toEqual({ enabled: true })
    expect(result.name).toBe('Component')
  })

  it('returns empty object for element with no data attributes', () => {
    expect(parseDataProperties(el)).toEqual({})
  })

  it('handles null or undefined element', () => {
    expect(parseDataProperties(null)).toEqual({})
    expect(parseDataProperties(undefined)).toEqual({})
  })
})
