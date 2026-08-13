// /plugins/search/index.js
import './search.scss'
import { DEFAULTS } from './defaults.js'

export default function createPlugin (options = {}) {
  return {
    ...DEFAULTS,
    ...options,
    id: 'search',
    load: async () => {
      const module = (await import(/* webpackChunkName: "im-search-plugin" */ './manifest.js')).manifest
      return module
    }
  }
}
