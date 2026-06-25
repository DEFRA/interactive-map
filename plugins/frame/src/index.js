// /plugins/frame/index.js
import './frame.scss'

export default function createPlugin (options = {}) {
  return {
    ...options,
    id: 'frame',
    load: async () => {
      const module = (await import(/* webpackChunkName: "im-frame-plugin" */ './manifest.js')).manifest
      return module
    }
  }
}
