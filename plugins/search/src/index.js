// /plugins/search/index.js
import './search.scss'
import { DEFAULTS } from './defaults.js'

export default function createPlugin (options = {}) {
  return {
    ...DEFAULTS,
    ...options,
    ...(options.expanded && { manifest: { controls: [{ id: 'search', mobile: { slot: 'banner' } }] } }),
    id: 'search',
    load: async () => {
      const module = (await import(/* webpackChunkName: "im-search-plugin" */ './manifest.js')).manifest
      return module
    }
  }
}
