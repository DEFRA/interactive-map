import './flood-menu.scss'

export default function createPlugin (options = {}) {
  return {
    ...options,
    id: 'floodMenu',
    load: async () => {
      const module = (await import(/* webpackChunkName: "flood-menu-plugin" */ './manifest.js')).manifest
      return module
    }
  }
}
