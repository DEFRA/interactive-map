// /plugins/search/index.js
import './search.scss'

export default function createPlugin (options = {}) {
  // If search is open then we need to overirde the mobile slot
  if (options.isExpanded) {
    options.manifest = {controls: [{ id: 'search', mobile: { slot: 'banner' }}]}
  }

  return {
    showMarker: true,
    ...options,
    id: 'search',
    load: async () => {
      const module = (await import(/* webpackChunkName: "im-search-plugin" */ './manifest.js')).manifest
      return module
    }
  }
}
