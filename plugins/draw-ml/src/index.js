// /plugins/draw-ml/index.js
import './draw.scss'

export default function createPlugin (options = {}) {
  return {
    ...options,
    id: 'draw',
    load: async () => {
      const module = (await import(/* webpackChunkName: "im-draw-ml-plugin" */ './manifest.js')).manifest
      return module
    }
  }
}
