import './mapKey.scss'

export default function createPlugin (options = {}) {
  return {
    noKeyItemText: 'No features displayed',
    ...options,
    id: 'mapKey',
    load: async () => {
      const module = (await import(/* webpackChunkName: "im-map-key-plugin" */ './manifest.js')).manifest
      return module
    }
  }
}
