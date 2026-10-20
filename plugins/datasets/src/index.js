// /plugins/datasets/index.js
import './datasets.scss'

export default function createPlugin (options = { }) {
  const plugin = {
    noKeyItemText: 'No features displayed',
    ...options,
    id: 'datasets',
    load: async () => {
      const { createManifest } = await import(/* webpackChunkName: "im-datasets-plugin" */ './manifest.js')
      return createManifest(options)
    }
  }

  return plugin
}
