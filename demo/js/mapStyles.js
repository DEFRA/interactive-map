const COPYRIGHT_SYMBOL = 169
const OS_LOGO = '/assets/images/os-logo.svg'
const OS_LOGO_WHITE = '/assets/images/os-logo-white.svg'
const OS_LOGO_BLACK = '/assets/images/os-logo-black.svg'
const OS_LOGO_ALT = 'Ordnance Survey logo'
const OS_ATTRIBUTION = `Contains OS data ${String.fromCodePoint(COPYRIGHT_SYMBOL)} Crown copyright and database rights ${(new Date()).getFullYear()}`
const OUTDOOR_THUMBNAIL = '/assets/images/outdoor-map-thumb.jpg'
const DARK_THUMBNAIL = '/assets/images/dark-map-thumb.jpg'
const BW_THUMBNAIL = '/assets/images/black-and-white-map-thumb.jpg'
const BW_ID = 'black-and-white'
const BW_LABEL = 'Black/White'

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
  attribution: OS_ATTRIBUTION
}, {
  id: 'aerial',
  label: 'Aerial',
  mapColorScheme: 'dark',
  url: process.env.AERIAL_URL,
  thumbnail: '/assets/images/aerial-map-thumb.jpg',
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
  attribution: 'Test'
}, {
  id: BW_ID,
  label: BW_LABEL,
  url: process.env.VTS_BLACK_AND_WHITE_URL_27700,
  renderMode: 'vector',
  thumbnail: BW_THUMBNAIL,
  logo: OS_LOGO_BLACK,
  logoAltText: OS_LOGO_ALT,
  attribution: 'Test'
}]

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
  url: `${process.env.MAPS_OUTDOOR_URL}?key=${process.env.OS_CLIENT_ID}`,
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
  url: `${process.env.MAPS_ROAD_URL}?key=${process.env.OS_CLIENT_ID}`,
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
  url: `${process.env.MAPS_LIGHT_URL}?key=${process.env.OS_CLIENT_ID}`,
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
  mapsRasterStyles27700
}
