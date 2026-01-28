// /plugins/scale-bar/manifest.js
import { ScaleBar } from './ScaleBar.jsx'

export const manifest = {
  controls: [{
    id: 'scaleBar',
    label: 'Scale bar',
    mobile: {
      slot: 'footer-right'
    },
    tablet: {
      slot: 'footer-right'
    },
    desktop: {
      slot: 'footer-right'
    },
    render: ScaleBar
  }]
}
