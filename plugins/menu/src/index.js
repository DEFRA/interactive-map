import './menu.scss'

export default function createPlugin (options = {}) {
  return {
    noKeyItemText: 'No features displayed',
    ...options,
    id: 'menu',
    load: async () => {
      const module = (await import(/* webpackChunkName: "im-menu-plugin" */ './manifest.js')).manifest
      return module
    }
  }
}
