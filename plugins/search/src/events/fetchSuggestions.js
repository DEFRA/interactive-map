// src/plugins/search/events/fetchSuggestions.js

export const sanitiseQuery = (value) => value.replace(/[^a-zA-Z0-9\s\-.,]/g, '').trim()

const getRequestConfig = (ds, query, transformRequest) => {
  const defaultRequest = {
    url: ds.urlTemplate?.replace('{query}', encodeURIComponent(query)),
    options: { method: 'GET' }
  }

  if (typeof ds.buildRequest === 'function') {
    return ds.buildRequest(query, () => defaultRequest)
  }

  return typeof transformRequest === 'function'
    ? transformRequest(defaultRequest, query)
    : defaultRequest
}

/**
 * Helper to fetch and parse results for a single dataset
 * This flattens the nesting in the main loop.
 */
const fetchDatasetResults = async (ds, request, query) => {
  try {
    const response = await fetch(request.url, request.options)
    
    if (!response.ok) {
      console.error(`Fetch error for ${ds.label || 'dataset'}: ${response.status}`)
      return null
    }

    const json = await response.json()
    return ds.parseResults(json, query)
  } catch (err) {
    console.error(`Network error for ${ds.label || 'dataset'}:`, err)
    return null
  }
}

export const fetchSuggestions = async (value, datasets, dispatch, transformRequest) => {
  const sanitisedValue = sanitiseQuery(value)

  const activeDatasets = datasets.filter(ds => {
    const include = ds.includeRegex ? ds.includeRegex.test(sanitisedValue) : true
    const exclude = ds.excludeRegex ? ds.excludeRegex.test(sanitisedValue) : false
    return include && !exclude
  })

  let finalResults = []

  for (const ds of activeDatasets) {
    const request = getRequestConfig(ds, sanitisedValue, transformRequest)
    const results = await fetchDatasetResults(ds, request, sanitisedValue)

    // Check if we have results to add
    if (results?.length) {
      finalResults = [...finalResults, ...results]

      // Only one control-flow statement allowed: the break for exclusivity
      if (ds.exclusive) {
        break
      }
    }
  }

  dispatch({ type: 'UPDATE_SUGGESTIONS', payload: finalResults })
  
  return {
    results: finalResults,
    sanitisedValue
  }
}