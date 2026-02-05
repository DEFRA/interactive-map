/**
 * Fetch GeoJSON from URL with transformRequest
 * @param {string} baseUrl - Base URL for the GeoJSON endpoint
 * @param {Object} context - { bbox, zoom, dataset }
 * @param {Function} transformRequest - Function to transform the request (builds URL with bbox, adds headers)
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export const fetchGeoJSON = async (baseUrl, context, transformRequest) => {
  const result = transformRequest(baseUrl, context)

  // Handle both string and object return values
  const config = typeof result === 'string' ? { url: result } : result
  const { url, headers = {} } = config

  const response = await fetch(url, { headers })

  if (!response.ok) {
    throw new Error(`Failed to fetch GeoJSON: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  // Ensure we have a FeatureCollection
  if (data.type === 'FeatureCollection') {
    return data
  }

  // Wrap single feature or array of features
  if (data.type === 'Feature') {
    return { type: 'FeatureCollection', features: [data] }
  }

  if (Array.isArray(data)) {
    return { type: 'FeatureCollection', features: data }
  }

  throw new Error('Invalid GeoJSON response')
}
