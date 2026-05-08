// src/plugins/search/events/fetchSuggestions.js

export const sanitiseQuery = (value) => value.replaceAll(/[^a-zA-Z0-9\s\-.,]/g, '').trim()

const toRequest = ({ url, options }) => new Request(url, options)

const getRequestConfig = async (ds, query, transformRequest) => {
  const defaultRequest = {
    url: ds.urlTemplate?.replace('{query}', encodeURIComponent(query)),
    options: { method: 'GET' }
  }

  if (ds.buildRequest) {
    const result = ds.buildRequest(query, () => defaultRequest)
    return result instanceof Request ? result : toRequest(result)
  }

  if (transformRequest) {
    return toRequest(await transformRequest(defaultRequest, query))
  }

  return toRequest(defaultRequest)
}

/**
 * Helper to fetch and parse results for a single dataset
 * This flattens the nesting in the main loop.
 */
const fetchDatasetResults = async (ds, request, query) => {
  try {
    const response = await fetch(request)

    if (!response.ok) {
      console.error(`Fetch error for ${ds.label || 'dataset'}: ${response.status}`)
      return { error: true }
    }

    const json = await response.json()
    return ds.parseResults(json, query)
  } catch (err) {
    console.error(`Network error for ${ds.label || 'dataset'}:`, err)
    return { error: true }
  }
}

export const fetchSuggestions = async (value, datasets, dispatch, transformRequest) => {
  const sanitisedValue = sanitiseQuery(value)

  const activeDatasets = datasets.filter(ds => {
    const include = ds.includeRegex ? ds.includeRegex.test(value) : true
    const exclude = ds.excludeRegex ? ds.excludeRegex.test(sanitisedValue) : false
    return include && !exclude
  })

  let finalResults = []
  let hasError = false

  for (const ds of activeDatasets) {
    const request = await getRequestConfig(ds, sanitisedValue, transformRequest)
    const results = await fetchDatasetResults(ds, request, sanitisedValue)

    if (results?.error) {
      hasError = true
    } else if (results?.length) {
      finalResults = [...finalResults, ...results]
    }

    if (ds.exclusive && finalResults.length) {
      break
    }
  }

  dispatch({ type: 'UPDATE_SUGGESTIONS', payload: { results: finalResults, hasError } })

  return {
    results: finalResults,
    sanitisedValue
  }
}
