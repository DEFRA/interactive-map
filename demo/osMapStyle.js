import useDocusaurusContext from '@docusaurus/useDocusaurusContext'

const WEB_MERCATOR_SRS = 3857

export const OS_ATTRIBUTION = `Contains OS data © Crown copyright and database rights ${new Date().getFullYear()}`

export const OS_VTS_STYLE_URLS = {
  outdoor: 'https://raw.githubusercontent.com/OrdnanceSurvey/OS-Vector-Tile-API-Stylesheets/main/OS_VTS_3857_Open_Outdoor.json',
  dark: 'https://raw.githubusercontent.com/OrdnanceSurvey/OS-Vector-Tile-API-Stylesheets/main/OS_VTS_3857_Open_Dark.json',
  blackWhite: 'https://raw.githubusercontent.com/OrdnanceSurvey/OS-Vector-Tile-API-Stylesheets/main/OS_VTS_3857_Open_Black_and_White.json'
}

// The style JSON itself needs no key — only the tile/font requests it triggers
// (all served from api.os.uk) do, so append it there instead. srs=3857 is required
// too: without it the API serves tiles on its default British National Grid (27700)
// tiling scheme, so Web Mercator x/y/z coords fetch the wrong (near-empty) tiles
const createTransformRequest = (osApiKey) => (url) => {
  if (!url.startsWith('https://api.os.uk')) {
    return { url }
  }
  const withKey = new URL(url)
  if (!withKey.searchParams.has('key')) {
    withKey.searchParams.append('key', osApiKey)
  }
  if (!withKey.searchParams.has('srs')) {
    withKey.searchParams.append('srs', WEB_MERCATOR_SRS)
  }
  return { url: withKey.toString() }
}

// Hook so demos don't each need their own useDocusaurusContext() + wiring
export const useOsTransformRequest = () => {
  const { siteConfig } = useDocusaurusContext()
  return createTransformRequest(siteConfig.customFields?.osApiKey)
}

export const OS_NAMES_URL = 'https://api.os.uk/search/names/v1/find?query={query}&fq=local_type:postcode%20local_type:hamlet%20local_type:village%20local_type:town%20local_type:city%20local_type:other_settlement&maxresults=8'

// The search plugin's transformRequest works on a Request object (not a url string,
// unlike the map's transformRequest above) — same key requirement, different shape
const createGeocodeTransformRequest = (osApiKey) => (request) => {
  if (!request.url.startsWith('https://api.os.uk')) {
    return request
  }
  const withKey = new URL(request.url)
  if (!withKey.searchParams.has('key')) {
    withKey.searchParams.append('key', osApiKey)
  }
  return new Request(withKey.toString(), {
    method: request.method,
    headers: request.headers
  })
}

export const useOsGeocodeTransformRequest = () => {
  const { siteConfig } = useDocusaurusContext()
  return createGeocodeTransformRequest(siteConfig.customFields?.osApiKey)
}
