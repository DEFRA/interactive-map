// Internal (not exported) - Accept optional search string for testing
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

const setMapStateInURL = (id, state, currentHref = window.location.href) => {
  // Use the passed href or the global one
  const url = new URL(currentHref || 'http://localhost')
  const params = [...new URLSearchParams(url.search)].map(([key, value]) => `${key}=${value}`)
  const newParams = []

  if (state.center) {
    newParams.push(`${id}:center=${state.center[0]},${state.center[1]}`)
  }
  if (state.zoom != null) {
    newParams.push(`${id}:zoom=${state.zoom}`)
  }

  const filteredParams = params.filter(p => {
    return !newParams.some(np => np.split('=')[0] === p.split('=')[0])
  })

  const hash = url.hash || ''
  const newUrl = `${url.origin}${url.pathname}?${[...filteredParams, ...newParams].join('&')}${hash}`
  window.history.replaceState(window.history.state, '', newUrl)
}

const getInitialMapState = ({ id, center, zoom, bounds }, search = window.location.search) => {
  // Pass search string down to the internal function
  const savedState = getMapStateFromURL(id, search)
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
