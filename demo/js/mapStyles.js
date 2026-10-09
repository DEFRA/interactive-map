const COPYRIGHT_SYMBOL = 169
const OS_LOGO = '/assets/images/os-logo.svg'
const OS_LOGO_WHITE = '/assets/images/os-logo-white.svg'
const OS_LOGO_BLACK = '/assets/images/os-logo-black.svg'
const OS_LOGO_ALT = 'Ordnance Survey logo'
const OS_ATTRIBUTION = `<a href="https://www.ordnancesurvey.co.uk/">&copy; Crown copyright and database rights 2026 OS 123456789 </a>`
const OUTDOOR_THUMBNAIL = '/assets/images/outdoor-map-thumb.jpg'
const DARK_THUMBNAIL = '/assets/images/dark-map-thumb.jpg'
const BW_THUMBNAIL = '/assets/images/black-and-white-map-thumb.jpg'
const AERIAL_THUMBNAIL = '/assets/images/aerial-map-thumb.jpg'
const BW_ID = 'black-and-white'
const BW_LABEL = 'Black/White'

// Real OS National Grid coverage extent [minX, minY, maxX, maxY], EPSG:27700 — captured from
// OS's own VTS capabilities response (matches the TILE_GRID_ORIGIN corner already baked into
// providers/beta/openlayers/src/defaults.js). Used to stop the raster styles below requesting
// tiles for areas OS has no coverage for.
const OS_NATIONAL_GRID_EXTENT_27700 = [-238375, 0, 700000, 1300000]

const openMapStyles = [{
  id: 'outdoor',
  label: 'Outdoor',
  url: process.env.OZS_OUTDOOR_URL,
  thumbnail: '',
  logo: OS_LOGO,
  logoAltText: OS_LOGO_ALT,
  attribution: OS_ATTRIBUTION,
  backgroundColor: '#f5f5f0'
}, {
  id: 'night',
  label: 'Night',
  url: process.env.NIGHT_URL,
  mapColorScheme: 'dark',
  appColorScheme: 'dark',
  thumbnail: '',
  logo: OS_LOGO_WHITE,
  logoAltText: OS_LOGO_ALT,
  attribution: 'Test'
}, {
  id: 'deuteranopia',
  label: 'Deuteranopia',
  url: process.env.DEUTERANOPIA_URL,
  thumbnail: '',
  logo: OS_LOGO,
  logoAltText: OS_LOGO_ALT,
  attribution: 'Test'
}, {
  id: 'tritanopia',
  label: 'Tritanopia',
  url: process.env.TRITANOPIA_URL,
  thumbnail: '',
  logo: OS_LOGO,
  logoAltText: OS_LOGO_ALT,
  attribution: 'Test'
}]

const vtsMapStyles3857 = [{
  id: 'outdoor',
  label: 'Outdoor',
  url: process.env.VTS_OUTDOOR_URL,
  thumbnail: OUTDOOR_THUMBNAIL,
  logo: OS_LOGO,
  logoAltText: OS_LOGO_ALT,
  attribution: OS_ATTRIBUTION,
  backgroundColor: '#f5f5f0'
}, {
  id: 'dark',
  label: 'Dark',
  url: process.env.VTS_DARK_URL,
  mapColorScheme: 'dark',
  appColorScheme: 'dark',
  thumbnail: DARK_THUMBNAIL,
  logo: OS_LOGO_WHITE,
  logoAltText: OS_LOGO_ALT,
  attribution: OS_ATTRIBUTION
}, {
  id: BW_ID,
  label: BW_LABEL,
  url: process.env.VTS_BLACK_AND_WHITE_URL,
  thumbnail: BW_THUMBNAIL,
  logo: OS_LOGO_BLACK,
  logoAltText: OS_LOGO_ALT,
  attribution: OS_ATTRIBUTION,
  showAttributionOnMobile: true
}, {
  id: 'aerial',
  label: 'Aerial',
  mapColorScheme: 'dark',
  url: process.env.AERIAL_URL,
  thumbnail: AERIAL_THUMBNAIL,
  logoAltText: OS_LOGO_ALT,
  attribution: 'Test'
}]

const vtsMapStyles27700 = [{
  id: 'outdoor',
  label: 'Outdoor',
  url: process.env.VTS_OUTDOOR_URL_27700,
  renderMode: 'vector',
  thumbnail: OUTDOOR_THUMBNAIL,
  logo: OS_LOGO,
  logoAltText: OS_LOGO_ALT,
  attribution: OS_ATTRIBUTION,
  backgroundColor: '#f5f5f0'
}, {
  id: 'dark',
  label: 'Dark',
  url: process.env.VTS_DARK_URL_27700,
  renderMode: 'vector',
  mapColorScheme: 'dark',
  appColorScheme: 'dark',
  thumbnail: DARK_THUMBNAIL,
  logo: OS_LOGO_WHITE,
  logoAltText: OS_LOGO_ALT,
  attribution: OS_ATTRIBUTION
}, {
  id: BW_ID,
  label: BW_LABEL,
  url: process.env.VTS_BLACK_AND_WHITE_URL_27700,
  renderMode: 'vector',
  thumbnail: BW_THUMBNAIL,
  logo: OS_LOGO_BLACK,
  logoAltText: OS_LOGO_ALT,
  attribution: OS_ATTRIBUTION
}]

const apgbAerialStyle = {
  id: 'apgb-aerial-125mm',
  label: 'Aerial',
  type: 'wms',
  url: process.env.APGB_WMS_URL,
  params: { LAYERS: 'APGB_Latest_UK_125mm', BGCOLOR: '0x1E3448', TRANSPARENT: false },
  thumbnail: AERIAL_THUMBNAIL,
  mapColorScheme: 'dark',
  attribution: `${String.fromCodePoint(COPYRIGHT_SYMBOL)} Getmapping Plc and Bluesky International Limited ${(new Date()).getFullYear()}`
}

const ngdMapStyles27700 = [{
  id: 'outdoor',
  label: 'Outdoor',
  type: 'ogc-vt',
  renderMode: 'vector',
  url: `${process.env.NGD_OUTDOOR_URL_27700}?key=${process.env.OS_CLIENT_ID}`,
  thumbnail: OUTDOOR_THUMBNAIL,
  logo: OS_LOGO,
  logoAltText: OS_LOGO_ALT,
  attribution: OS_ATTRIBUTION,
  backgroundColor: '#f5f5f0',
  appColorScheme: 'light',
  mapColorScheme: 'light'
}, {
  id: BW_ID,
  label: BW_LABEL,
  type: 'ogc-vt',
  renderMode: 'vector',
  url: `${process.env.NGD_BLACK_AND_WHITE_URL_27700}?key=${process.env.OS_CLIENT_ID}`,
  thumbnail: BW_THUMBNAIL,
  logo: OS_LOGO_BLACK,
  logoAltText: OS_LOGO_ALT,
  attribution: OS_ATTRIBUTION,
  backgroundColor: '#f0f0f0',
  appColorScheme: 'light',
  mapColorScheme: 'light'
}]

const mapsRasterStyles27700 = [{
  id: 'outdoor',
  label: 'Outdoor',
  type: 'raster',
  url: `${process.env.MAPS_OUTDOOR_URL}?key=${process.env.OS_CLIENT_ID}`,
  extent: OS_NATIONAL_GRID_EXTENT_27700,
  thumbnail: '/assets/images/outdoor-raster-thumb.jpg',
  logo: OS_LOGO,
  logoAltText: OS_LOGO_ALT,
  attribution: OS_ATTRIBUTION,
  backgroundColor: '#f5f5f0',
  appColorScheme: 'light',
  mapColorScheme: 'light'
}, {
  id: 'road',
  label: 'Road',
  type: 'raster',
  url: `${process.env.MAPS_ROAD_URL}?key=${process.env.OS_CLIENT_ID}`,
  extent: OS_NATIONAL_GRID_EXTENT_27700,
  thumbnail: '/assets/images/road-raster-thumb.jpg',
  logo: OS_LOGO,
  logoAltText: OS_LOGO_ALT,
  attribution: OS_ATTRIBUTION,
  backgroundColor: '#ffffff',
  appColorScheme: 'light',
  mapColorScheme: 'light'
}, {
  id: 'light',
  label: 'Light',
  type: 'raster',
  url: `${process.env.MAPS_LIGHT_URL}?key=${process.env.OS_CLIENT_ID}`,
  extent: OS_NATIONAL_GRID_EXTENT_27700,
  thumbnail: '/assets/images/light-raster-thumb.jpg',
  logo: OS_LOGO,
  logoAltText: OS_LOGO_ALT,
  attribution: OS_ATTRIBUTION,
  backgroundColor: '#f0f0f0',
  appColorScheme: 'light',
  mapColorScheme: 'light'
}]

export {
  openMapStyles,
  vtsMapStyles3857,
  vtsMapStyles27700,
  ngdMapStyles27700,
  mapsRasterStyles27700,
  apgbAerialStyle
}
