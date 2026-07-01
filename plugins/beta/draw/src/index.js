export default function createPlugin (options = {}) {
  return {
    ...options,
    id: 'draw',
    load: async () => {
      const module = (await import(/* webpackChunkName: "im-draw-plugin" */ './manifest.js')).manifest
      return module
    }
  }
}
