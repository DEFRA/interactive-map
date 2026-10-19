import { parseDataProperties } from './parseDataProperties.js'

describe('parseDataProperties', () => {
  let el
  let logSpy
  let errorSpy

  beforeEach(() => {
    el = document.createElement('div')
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('parses JSON object and array attributes', () => {
    el.dataset.config = '{"foo":"bar"}'
    el.dataset.numbers = '[1,2,3]'

    const result = parseDataProperties(el)

    expect(result.config).toEqual({ foo: 'bar' })
    expect(result.numbers).toEqual([1, 2, 3])
  })

  it('parses JSON numbers, booleans, null and quoted strings', () => {
    el.dataset.zoom = '7'
    el.dataset.enabled = 'false'
    el.dataset.empty = 'null'
    el.dataset.behaviour = '"hybrid"'

    const result = parseDataProperties(el)

    expect(result.zoom).toBe(7)
    expect(result.enabled).toBe(false)
    expect(result.empty).toBeNull()
    expect(result.behaviour).toBe('hybrid')
  })

  it('returns plain strings unchanged when they are not valid JSON', () => {
    el.dataset.behaviour = 'hybrid'
    el.dataset.title = 'Hello World'

    const result = parseDataProperties(el)

    expect(result.behaviour).toBe('hybrid')
    expect(result.title).toBe('Hello World')
  })

  it('keeps app-specific attributes such as paths, URLs and tokens as strings', () => {
    el.dataset.backLinkPath = '/quote/boundary-type'
    el.dataset.saveAndContinueUrl = 'https://example.com/quote/draw-boundary/save?x=1'
    el.dataset.csrfToken = 'NV3T3p+abc/def=='

    const result = parseDataProperties(el)

    expect(result.backLinkPath).toBe('/quote/boundary-type')
    expect(result.saveAndContinueUrl).toBe('https://example.com/quote/draw-boundary/save?x=1')
    expect(result.csrfToken).toBe('NV3T3p+abc/def==')
  })

  it('returns malformed JSON and empty values as the raw string', () => {
    el.dataset.broken = '{"foo":'
    el.dataset.blank = ''

    const result = parseDataProperties(el)

    expect(result.broken).toBe('{"foo":')
    expect(result.blank).toBe('')
  })

  it('handles mixed JSON and plain string attributes', () => {
    el.dataset.config = '{"enabled":true}'
    el.dataset.name = 'Component'

    const result = parseDataProperties(el)

    expect(result.config).toEqual({ enabled: true })
    expect(result.name).toBe('Component')
  })

  it('does not log to the console when attributes are not valid JSON', () => {
    el.dataset.backLinkPath = '/quote/boundary-type'
    el.dataset.example = 'hello'
    el.dataset.broken = '{"foo":'

    parseDataProperties(el)

    expect(logSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('returns empty object for element with no data attributes', () => {
    expect(parseDataProperties(el)).toEqual({})
  })

  it('handles null or undefined element', () => {
    expect(parseDataProperties(null)).toEqual({})
    expect(parseDataProperties(undefined)).toEqual({})
  })
})
