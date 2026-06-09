// /plugins/scale-bar/index.js
import './scaleBar.scss'

export default function createPlugin ({ manifest, units = 'metric' } = {}) {
  return {
    id: 'scaleBar',
    manifest,
    units,
    load: async () => {
      const module = (await import(/* webpackChunkName: "im-scale-bar-plugin" */ './manifest.js')).manifest
      return module
    }
  }
}
