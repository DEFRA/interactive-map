/**
 * @typedef {import('../../../../src/types.js').MapProviderDescriptor} MapProviderDescriptor
 * @typedef {import('../../../../src/types.js').MapProviderLoadResult} MapProviderLoadResult
 * @typedef {import('../../../../src/types.js').MapProviderConfig} MapProviderConfig
 * @typedef {import('../../../../src/types.js').OpenLayersProviderConfig} OpenLayersProviderConfig
 */

/**
 * Returns the reason the device cannot run OpenLayers, or undefined if it can.
 * OpenLayers uses class fields and private methods (Chrome 84 / Firefox 90 /
 * Safari 15); `Array.prototype.at` (Chrome 92 / Firefox 90 / Safari 15.4) is the proxy.
 *
 * @returns {string|undefined}
 */
function getUnsupportedReason () {
  if (document.documentMode) {
    return 'Internet Explorer is not supported'
  }
  if (!document.createElement('canvas').getContext) {
    return 'Canvas is not supported in this browser'
  }
  if (typeof [].at !== 'function') {
    return 'Browser does not support the JavaScript features OpenLayers requires'
  }
  return undefined
}

/**
 * Creates an OpenLayers provider descriptor for lazy-loading the map provider.
 *
 * @param {OpenLayersProviderConfig} [config={}] - Optional provider configuration overrides.
 * @returns {MapProviderDescriptor} The map provider descriptor.
 */
export default function createOpenLayersProvider ({ zoomAlignment } = {}) {
  return {
    checkDeviceCapabilities: () => {
      const error = getUnsupportedReason()
      return {
        isSupported: !error,
        error
      }
    },
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
