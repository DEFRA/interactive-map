// /plugins//index.js
import './mapKey.scss'

export default function createPlugin ({ manifest, units = 'metric' } = {}) {
  return {
    id: 'mapKey',
    manifest,
    units,
    load: async () => {
      const module = (await import(/* webpackChunkName: "im--plugin" */ './manifest.js')).manifest
      return module
    }
  }
}
