// /plugins/use-location/index.js
export default function createPlugin () {
  return {
    id: 'useLocation',
    load: async () => {
      const module = (await import(/* webpackChunkName: "im-use-location-plugin" */ './manifest.js')).manifest
      return module
    }
  }
}
