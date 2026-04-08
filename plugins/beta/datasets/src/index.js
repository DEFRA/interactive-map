// /plugins/datasets/index.js
import './datasets.scss'

export default function createPlugin (options = { }) {
  console.log('options', options)
  const plugin = {
    noKeyItemText: 'No features displayed',
    ...options,
    id: 'datasets',
    load: async () => {
      const module = (await import(/* webpackChunkName: "im-datasets-plugin" */ './manifest.js')).manifest
      return module
    }
  }

  return plugin
}
