export default function createOpenLayersProvider ({ zoomAlignment } = {}) {
  return {
    checkDeviceCapabilities: () => ({
      isSupported: !!document.createElement('canvas').getContext,
      error: 'Canvas is not supported in this browser'
    }),
    load: async () => {
      const MapProvider = (await import(/* webpackChunkName: "im-openlayers-provider" */ './openlayersProvider.js')).default

      const mapProviderConfig = {
        zoomAlignment,
        crs: 'EPSG:27700'
      }

      return {
        MapProvider,
        mapProviderConfig
      }
    }
  }
}
