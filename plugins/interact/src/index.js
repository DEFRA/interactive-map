// /plugins/interact/index.js
import './interact.scss'

export default function createPlugin (options = {}) {
  return {
    ...options,
    // Fixed props
    id: 'interact',
    load: async () => {
      const module = (await import(/* webpackChunkName: "im-interact-plugin" */ './manifest.js')).manifest
      return module
    }
  }
}
