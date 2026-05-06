// /plugins/interact/index.js
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
