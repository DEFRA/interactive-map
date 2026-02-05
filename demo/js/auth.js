const esriAuth = { token: null, expiresAt: 0 }
const osAuth = { token: null, expiresAt: 0 }

const transformGeocodeRequest = (request) => {
  // Add API key to OS Names service
  if(request.url.startsWith('https://api.os.uk')) {
    const url = new URL(request.url)
    url.searchParams.set('key', process.env.OS_CLIENT_ID)
    return new Request(url.toString(), {
      method: request.method,
      headers: request.headers
    })
  }

  return request
}

const transformTileRequest = (url, resourceType) => {
  let headers = {}

  // OS Vector Tile API
  if(resourceType !== 'Style' && url.startsWith('https://api.os.uk')) {
    url = new URL(url)
    if (!url.searchParams.has('key')) {
      url.searchParams.append('key', process.env.OS_CLIENT_ID)
    }
    if(!url.searchParams.has('srs')) {
      url.searchParams.append('srs', 3857)
    }
    url = new Request(url).url
  }

  return {
    url, headers
  }
}

const setupEsriConfig = async (esriConfig) => {
  // Set ESRI API key (using cached token)
  esriConfig.apiKey = await getEsriToken()

  // Add OS Maps token interceptor
  esriConfig.request.interceptors.push({
    urls: 'https://api.os.uk/maps/vector/v1/vts',
    before: async (request) => {
      request.requestOptions.headers = {
        ...request.requestOptions.headers,
        Authorization: `Bearer ${await getOsToken()}`
      }
    }
  })
}

async function getEsriToken() {
  const expired = !esriAuth.token || Date.now() >= esriAuth.expiresAt

  if (expired) {
    try {
      const response = await fetch('/esri-token')
      const json = await response.json()
      esriAuth.token = json.token
      esriAuth.expiresAt = Date.now() + (json.expires_in - 30) * 1000
    } catch (err) {
      console.error("Failed to fetch ESRI token:", err)
      throw err
    }
  }

  return esriAuth.token
}

// --- Helper: fetch & cache OS token ---
async function getOsToken() {
  const expired = !osAuth.token || Date.now() >= osAuth.expiresAt

  if (expired) {
    try {
      const response = await fetch('/os-token')
      const json = await response.json()
      osAuth.token = json.access_token
      osAuth.expiresAt = Date.now() + (json.expires_in - 30) * 1000
    } catch (err) {
      console.error("Failed to fetch OS token:", err)
      throw err
    }
  }

  return osAuth.token
}

/**
 * Transform request for dynamic GeoJSON datasets
 * @param {string} url - Base URL
 * @param {Object} context - { bbox, zoom, dataset }
 * @returns {Object} { url, headers }
 */
const transformDataRequest = (url, { bbox, zoom }) => {
  const separator = url.includes('?') ? '&' : '?'
  return {
    url: `${url}${separator}bbox=${bbox.join(',')}`
  }
}

export {
  transformGeocodeRequest,
  transformTileRequest,
  transformDataRequest,
  setupEsriConfig
}