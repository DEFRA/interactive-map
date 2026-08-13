import './mapKey.scss'

export default function createPlugin ({ manifest } = {}) {
  return {
    id: 'mapKey',
    manifest,
    load: async () => {
      const module = (await import(/* webpackChunkName: "im-map-key-plugin" */ './manifest.js')).manifest
      return module
    }
  }
}
