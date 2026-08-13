import { fetchGeoJSON } from './fetchGeoJSON.js'

const baseUrl = 'https://api.example.com/features'
const context = { bbox: [-1, -1, 1, 1], zoom: 10 }
const signal = { aborted: false }

const mockResponse = ({ ok = true, status = 200, statusText = 'OK', body = {} } = {}) => ({
  ok,
  status,
  statusText,
  json: async () => body
})

beforeEach(() => {
  global.fetch = jest.fn()
})

describe('fetchGeoJSON', () => {
  it('calls transformRequest with the base URL and context, then fetches the returned url/headers', async () => {
    const featureCollection = { type: 'FeatureCollection', features: [] }
    global.fetch.mockResolvedValueOnce(mockResponse({ body: featureCollection }))
    const transformRequest = jest.fn(() => ({ url: `${baseUrl}?bbox=${context.bbox.join(',')}`, headers: { Authorization: 'Bearer token' } }))

    const result = await fetchGeoJSON(baseUrl, context, transformRequest, signal)

    expect(transformRequest).toHaveBeenCalledWith(baseUrl, context)
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}?bbox=-1,-1,1,1`,
      { headers: { Authorization: 'Bearer token' }, signal }
    )
    expect(result).toBe(featureCollection)
  })

  it('supports transformRequest returning a plain URL string, defaulting headers to {}', async () => {
    global.fetch.mockResolvedValueOnce(mockResponse({ body: { type: 'FeatureCollection', features: [] } }))
    const transformRequest = () => baseUrl

    await fetchGeoJSON(baseUrl, context, transformRequest, signal)

    expect(fetch).toHaveBeenCalledWith(baseUrl, { headers: {}, signal })
  })

  it('defaults headers to {} when transformRequest returns an object without headers', async () => {
    global.fetch.mockResolvedValueOnce(mockResponse({ body: { type: 'FeatureCollection', features: [] } }))
    const transformRequest = () => ({ url: baseUrl })

    await fetchGeoJSON(baseUrl, context, transformRequest, signal)

    expect(fetch).toHaveBeenCalledWith(baseUrl, { headers: {}, signal })
  })

  it('throws when the response is not ok', async () => {
    global.fetch.mockResolvedValueOnce(mockResponse({ ok: false, status: 500, statusText: 'Server Error' }))

    await expect(fetchGeoJSON(baseUrl, context, () => baseUrl, signal))
      .rejects.toThrow('Failed to fetch GeoJSON: 500 Server Error')
  })

  it('wraps a single Feature into a FeatureCollection', async () => {
    const feature = { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] } }
    global.fetch.mockResolvedValueOnce(mockResponse({ body: feature }))

    const result = await fetchGeoJSON(baseUrl, context, () => baseUrl, signal)

    expect(result).toEqual({ type: 'FeatureCollection', features: [feature] })
  })

  it('wraps a bare array of features into a FeatureCollection', async () => {
    const features = [{ type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] } }]
    global.fetch.mockResolvedValueOnce(mockResponse({ body: features }))

    const result = await fetchGeoJSON(baseUrl, context, () => baseUrl, signal)

    expect(result).toEqual({ type: 'FeatureCollection', features })
  })

  it('throws for an unrecognized response shape', async () => {
    global.fetch.mockResolvedValueOnce(mockResponse({ body: { type: 'NotGeoJSON' } }))

    await expect(fetchGeoJSON(baseUrl, context, () => baseUrl, signal))
      .rejects.toThrow('Invalid GeoJSON response')
  })
})
