// /plugins//manifest.js
import { MapKey } from './MapKey.jsx'

export const manifest = {
  controls: [{
    id: 'mapKey',
    label: 'Scale bar',
    mobile: {
      slot: 'right-bottom'
    },
    tablet: {
      slot: 'right-bottom'
    },
    desktop: {
      slot: 'right-bottom'
    },
    render: MapKey
  }]
}
