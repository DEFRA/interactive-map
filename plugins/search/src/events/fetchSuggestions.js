// src/plugins/search/events/fetchSuggestions.js
import { fetchDataset } from '../utils/fetchDataset.js'

/**
 * Sanitise input query
 * Allows letters, numbers, spaces, dashes, commas, full stops
 */
const sanitiseQuery = (value) => value.replace(/[^a-zA-Z0-9\s\-.,]/g, '').trim()

/**
 * Fetch suggestions from multiple datasets
 *
 * - Applies dataset include/exclude regex filtering
 * - Supports dataset-level buildRequest or urlTemplate with optional global transformRequest
 * - Supports exclusive datasets: if exclusive dataset returns results, stop querying further datasets
 * - Merges results in dataset order
 */
const fetchSuggestions = async (value, datasets, dispatch, transformRequest) => {
  const sanitisedValue = sanitiseQuery(value)

  // Filter datasets based on includeRegex / excludeRegex
  const activeDatasets = datasets.filter(ds => {
    const include = ds.includeRegex ? ds.includeRegex.test(sanitisedValue) : true
    const exclude = ds.excludeRegex ? ds.excludeRegex.test(sanitisedValue) : false
    return include && !exclude
  })

  let finalResults = []

  // Query datasets sequentially to respect 'exclusive' flag
  for (const ds of activeDatasets) {
    // Default GET request builder using urlTemplate
    const defaultBuildRequest = (query) => ({
      url: ds.urlTemplate?.replace('{query}', encodeURIComponent(query)),
      options: { method: 'GET' }
    })

    let request

    if (typeof ds.buildRequest === 'function') {
      // Dataset-level buildRequest takes full control; global transformRequest is ignored
      request = ds.buildRequest(sanitisedValue, defaultBuildRequest)
    } else {
      // Use default GET request and apply global transformRequest if provided
      request = defaultBuildRequest(sanitisedValue)
      if (typeof transformRequest === 'function') {
        request = transformRequest(request, sanitisedValue)
      }
    }

    // Perform the fetch
    const { url, options } = request
    const json = await fetchDataset(url, options)

    // Parse dataset-specific results
    const results = ds.parseResults(json, sanitisedValue)

    // Merge results into final array
    if (results.length) {
      finalResults = finalResults.concat(results)

      // If this dataset is exclusive and returned results, stop querying further datasets
      if (ds.exclusive) {
        break
      }
    }
  }

  // Dispatch all merged results
  dispatch({ type: 'UPDATE_SUGGESTIONS', payload: finalResults })

  return { results: finalResults, sanitisedValue }
}

export {
  sanitiseQuery,
  fetchSuggestions
}
