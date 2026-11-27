// /plugins/map-styles/index.js
import './mapStyles.scss'

export default function createPlugin ({ manifest, mapStyles } = {}) {
  return {
    id: 'mapStyles',
    manifest,
    mapStyles,
    load: async () => {
      const module = (await import(/* webpackChunkName: "im-map-styles-plugin" */ './manifest.js')).manifest
      return module
    },
    handlesMapStyle: true,
    api: {}
  }
}
