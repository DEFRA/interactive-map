/**
 * @typedef {import('../../../../src/types.js').MapProviderDescriptor} MapProviderDescriptor
 * @typedef {import('../../../../src/types.js').MapProviderLoadResult} MapProviderLoadResult
 * @typedef {import('../../../../src/types.js').MapProviderConfig} MapProviderConfig
 * @typedef {import('../../../../src/types.js').OpenLayersProviderConfig} OpenLayersProviderConfig
 */

/**
 * Creates an OpenLayers provider descriptor for lazy-loading the map provider.
 *
 * @param {OpenLayersProviderConfig} [config={}] - Optional provider configuration overrides.
 * @returns {MapProviderDescriptor} The map provider descriptor.
 */
export default function createOpenLayersProvider ({ zoomAlignment } = {}) {
  return {
    checkDeviceCapabilities: () => ({
      isSupported: !!document.createElement('canvas').getContext,
      error: 'Canvas is not supported in this browser'
    }),
    /** @returns {Promise<MapProviderLoadResult>} */
    load: async () => {
      const MapProvider = (await import(/* webpackChunkName: "im-openlayers-provider" */ './openlayersProvider.js')).default

      /** @type {MapProviderConfig} */
      const mapProviderConfig = {
        zoomAlignment,
        // Fixed, not user-configurable — the OpenLayers provider is BNG-native only.
        crs: 'EPSG:27700'
      }

      return {
        MapProvider,
        mapProviderConfig
      }
    }
  }
}
