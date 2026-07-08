export default function (config = {}) {
  return {
    ...config,
    load: async () => {
      const module = await import(/* webpackChunkName: "im-reverse-geocode" */ './reverseGeocode.js')
      return module.reverseGeocode
    }
  }
}
