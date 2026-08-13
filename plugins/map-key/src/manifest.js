// /plugins//manifest.js
import { MapKey } from './MapKey.jsx'

export const manifest = {
  controls: [{
    id: 'mapKey',
    label: 'Key',
    mobile: {
      slot: 'drawer'
    },
    tablet: {
      slot: 'top-left'
    },
    desktop: {
      slot: 'top-left'
    },
    render: MapKey
  }]
}
