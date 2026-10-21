// /plugins/scale-bar/manifest.js
import { ScaleBar } from './ScaleBar.jsx'

export const manifest = {
  controls: [{
    id: 'scaleBar',
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
    render: ScaleBar
  }]
}
