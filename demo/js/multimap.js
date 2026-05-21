import InteractiveMap from '../../src/index.js'
import maplibreProvider from '/providers/maplibre/src/index.js'
import { transformVtsRequest3857 } from './auth.js'

const mapStyle = {
  url: process.env.VTS_OUTDOOR_URL,
  logo: '/assets/images/os-logo.svg',
  logoAltText: 'Ordnance Survey logo',
  attribution: `Contains OS data © Crown copyright and database rights ${(new Date()).getFullYear()}`,
  backgroundColor: '#f5f5f0'
}

const commonConfig = {
  behaviour: 'buttonFirst',
  mapProvider: maplibreProvider(),
  minZoom: 6,
  maxZoom: 20,
  zoom: 13,
  containerHeight: '600px',
  transformRequest: transformVtsRequest3857,
  mapStyle,
  // preserveStateOnClose: true
  hasExitButton: true
}

new InteractiveMap('map-london', {
  ...commonConfig,
  mapLabel: 'Map of London',
  center: [-0.1276, 51.5074]
})

new InteractiveMap('map-manchester', {
  ...commonConfig,
  mapLabel: 'Map of Manchester',
  center: [-2.2426, 53.4808]
})

new InteractiveMap('map-edinburgh', {
  ...commonConfig,
  mapLabel: 'Map of Edinburgh',
  center: [-3.1883, 55.9533]
})
