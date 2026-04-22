/**
 * Reads center and zoom for a given map ID from a URL search string.
 * The `search` parameter is accepted explicitly to keep this function pure and testable.
 *
 * @param {string} id - Map instance ID.
 * @param {string} search - URL search string (e.g. `window.location.search`).
 * @returns {{ center: [number, number], zoom: number } | null}
 */
const getMapStateFromURL = (id, search) => {
  const params = new URLSearchParams(search)
  const centerStr = params.get(`${id}:center`)
  const zoomStr = params.get(`${id}:zoom`)
  if (!centerStr || !zoomStr) {
    return null
  }
  const [lng, lat] = centerStr.split(',').map(Number)
  const zoom = Number(zoomStr)
  return { center: [lng, lat], zoom }
}

/**
 * Persists map center and zoom into the page URL without triggering navigation.
 *
 * Existing query parameters are preserved. Parameters for this map ID are
 * replaced if already present. Builds the URL manually to avoid percent-encoding
 * colons and commas that URLSearchParams would otherwise encode.
 *
 * @param {string} id - Map instance ID, used as a namespace prefix for the params.
 * @param {{ center?: [number, number], zoom?: number }} state - Map state to write.
 * @param {string} [currentHref] - URL to update. Defaults to `window.location.href`.
 * @returns {void}
 */
const setMapStateInURL = (id, state, currentHref = window.location.href) => {
  const url = new URL(currentHref || 'http://localhost')

  const newKeys = new Set()
  const newParams = []

  if (state.center) {
    const key = `${id}:center`
    newKeys.add(key)
    newParams.push(`${key}=${state.center[0]},${state.center[1]}`)
  }
  if (state.zoom != null) {
    const key = `${id}:zoom`
    newKeys.add(key)
    newParams.push(`${key}=${state.zoom}`)
  }

  const existingParams = []
  url.searchParams.forEach((value, key) => {
    if (!newKeys.has(key)) {
      existingParams.push(`${key}=${value}`)
    }
  })

  const allParams = [...existingParams, ...newParams].join('&')
  const search = allParams ? '?' + allParams : ''
  const newUrl = `${url.origin}${url.pathname}${search}${url.hash}`
  window.history.replaceState(window.history.state, '', newUrl)
}

/**
 * Returns the initial map view state, preferring any saved state from the URL.
 *
 * Resolution order:
 * 1. Center/zoom encoded in the URL search string for this map ID.
 * 2. A `bounds` value if provided (used to fit the view on load).
 * 3. The configured `center` and `zoom` defaults.
 *
 * @param {{ id: string, center: [number, number], zoom: number, bounds?: any }} config - Map config.
 * @param {string} [search] - URL search string. Defaults to `window.location.search`.
 * @returns {{ center: [number, number], zoom: number } | { bounds: any }}
 */
const getInitialMapState = ({ id, center, zoom, bounds, urlPosition = 'sync' }, search = window.location.search) => {
  const savedState = urlPosition !== 'none' ? getMapStateFromURL(id, search) : null
  if (savedState) {
    return {
      center: savedState.center,
      zoom: savedState.zoom
    }
  } else if (bounds) {
    return {
      bounds
    }
  } else {
    return {
      center,
      zoom
    }
  }
}

export {
  setMapStateInURL,
  getInitialMapState
}
