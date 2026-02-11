/**
 * @typedef {import('../../../src/types.js').MapProviderDescriptor} MapProviderDescriptor
 * @typedef {import('../../../src/types.js').MapProviderLoadResult} MapProviderLoadResult
 * @typedef {import('../../../src/types.js').MapProviderConfig} MapProviderConfig
 */

import { getWebGL } from './utils/detectWebgl.js'

/**
 * Checks whether the browser supports modern ES2020 syntax
 * (optional chaining `?.` and nullish coalescing `??`), which
 * Chrome 80+ supports. Safe to use in ES5 bootstrap code.
 *
 * @returns {boolean} true if modern syntax is supported, false otherwise
 */
function supportsModernMaplibre() {
  try {
    // Try compiling ES2020 syntax dynamically
    new Function('var x = null ?? 5; var y = ({a:1})?.a;')
    return true
  }
  catch (e) {
    // Exception intentionally ignored; returns false for unsupported syntax
    void e // NOSONAR
    return false
  }
}

/**
 * Creates a MapLibre provider descriptor for lazy-loading the map provider.
 *
 * @param {Partial<MapProviderConfig>} [config={}] - Optional provider configuration overrides.
 * @returns {MapProviderDescriptor} The map provider descriptor.
 */
export default function (config = {}) {
  return {
    checkDeviceCapabilities: () => {
      const webGL = getWebGL(['webgl2', 'webgl1'])
      const isIE = document.documentMode
      return {
        isSupported: webGL.isEnabled && supportsModernMaplibre(),
        error: (isIE && 'Internet Explorer is not supported') || webGL.error
      }
    },
    /** @returns {Promise<MapProviderLoadResult>} */
    load: async () => {
      const mapFramework = await import(/* webpackChunkName: "im-maplibre-framework" */ 'maplibre-gl')
      const MapProvider = (await import(/* webpackChunkName: "im-maplibre-provider" */ './maplibreProvider.js')).default

      /** @type {MapProviderConfig} */
      const mapProviderConfig = {
        ...config,
        crs: 'EPSG:4326'
      }

      return {
        MapProvider,
        mapProviderConfig,
        mapFramework
      }
    }
  }
}
