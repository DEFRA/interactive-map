/**
 * @jest-environment jsdom
 */
import { fetchSuggestions, sanitiseQuery } from './fetchSuggestions.js'

describe('fetchSuggestions', () => {
  const dispatch = jest.fn()

  beforeEach(() => {
    dispatch.mockClear()
    global.fetch = jest.fn()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('sanitiseQuery strips invalid chars and trims', () => {
    expect(sanitiseQuery('  he!!llo@ ')).toBe('hello')
  })

  test('fetches results, applies parsing, and dispatches', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: ['a', 'b'] })
    })

    const datasets = [
      {
        urlTemplate: '/api?q={query}',
        parseResults: (json) => json.items
      }
    ]

    const result = await fetchSuggestions('test', datasets, dispatch)

    expect(fetch).toHaveBeenCalledWith('/api?q=test', { method: 'GET' })
    expect(result.results).toEqual(['a', 'b'])
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_SUGGESTIONS',
      payload: ['a', 'b']
    })
  })

  test('respects includeRegex and excludeRegex', async () => {
    const datasets = [
      {
        includeRegex: /^ok/,
        excludeRegex: /bad/,
        urlTemplate: '/x?q={query}',
        parseResults: () => ['x']
      }
    ]

    const result = await fetchSuggestions('bad', datasets, dispatch)

    expect(fetch).not.toHaveBeenCalled()
    expect(result.results).toEqual([])
  })

  test('uses buildRequest when provided', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    })

    const datasets = [
      {
        buildRequest: (query) => ({
          url: `/custom/${query}`,
          options: { method: 'POST' }
        }),
        parseResults: () => ['y']
      }
    ]

    const result = await fetchSuggestions('abc', datasets, dispatch)

    expect(fetch).toHaveBeenCalledWith('/custom/abc', { method: 'POST' })
    expect(result.results).toEqual(['y'])
  })

  test('uses transformRequest when provided', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    })

    const transformRequest = (req) => ({
      ...req,
      options: { method: 'PUT' }
    })

    const datasets = [
      {
        urlTemplate: '/t?q={query}',
        parseResults: () => ['z']
      }
    ]

    await fetchSuggestions('x', datasets, dispatch, transformRequest)

    expect(fetch).toHaveBeenCalledWith('/t?q=x', { method: 'PUT' })
  })

  test('handles fetch HTTP error', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const datasets = [
      {
        label: 'test-ds',
        urlTemplate: '/fail?q={query}',
        parseResults: () => ['nope']
      }
    ]

    const result = await fetchSuggestions('err', datasets, dispatch)

    expect(result.results).toEqual([])
    expect(console.error).toHaveBeenCalled()
  })

  test('uses fallback dataset label on fetch HTTP error', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404
    })

    const datasets = [
      {
        // no label on purpose
        urlTemplate: '/missing?q={query}',
        parseResults: () => []
      }
    ]

    await fetchSuggestions('oops', datasets, dispatch)

    expect(console.error).toHaveBeenCalledWith(
      'Fetch error for dataset: 404'
    )
  })

  test('handles network error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network'))

    const datasets = [
      {
        urlTemplate: '/net?q={query}',
        parseResults: () => ['nope']
      }
    ]

    const result = await fetchSuggestions('err', datasets, dispatch)

    expect(result.results).toEqual([])
    expect(console.error).toHaveBeenCalled()
  })

  test('stops processing when exclusive dataset returns results', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

    const datasets = [
      {
        exclusive: true,
        urlTemplate: '/first?q={query}',
        parseResults: () => ['first']
      },
      {
        urlTemplate: '/second?q={query}',
        parseResults: () => ['second']
      }
    ]

    const result = await fetchSuggestions('go', datasets, dispatch)

    expect(result.results).toEqual(['first'])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('buildRequest can call default request builder', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    })

    const datasets = [
      {
        buildRequest: (query, getDefault) => {
          // 👇 THIS is the missing function call
          return getDefault()
        },
        urlTemplate: '/default?q={query}',
        parseResults: () => ['ok']
      }
    ]

    const result = await fetchSuggestions('hi', datasets, dispatch)

    expect(fetch).toHaveBeenCalledWith('/default?q=hi', { method: 'GET' })
    expect(result.results).toEqual(['ok'])
  })
})