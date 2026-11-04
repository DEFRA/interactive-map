// /plugins/datasets/index.js
import './datasets.scss'

export default function createPlugin (options = { }) {
  const plugin = {
    ...options,
    id: 'datasets',
    load: async () => {
      const { createManifest } = await import(/* webpackChunkName: "im-datasets-plugin" */ './manifest.js')
      return createManifest(options)
    }
  }

  return plugin
}
