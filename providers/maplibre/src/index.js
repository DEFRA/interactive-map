/**
 * @typedef {import('../../../src/types.js').MapProviderDescriptor} MapProviderDescriptor
 * @typedef {import('../../../src/types.js').MapProviderLoadResult} MapProviderLoadResult
 * @typedef {import('../../../src/types.js').MapProviderConfig} MapProviderConfig
 */

import { getWebGL } from './utils/detectWebgl.js'

/**
 * Checks whether the browser supports the ES2020+ feature set required by
 * MapLibre, using `String.prototype.replaceAll` as a proxy. This method
 * landed in Chrome 85 / Firefox 77 / Safari 13.1 — the same cohort that
 * supports optional chaining `?.` and nullish coalescing `??`.
 *
 * @returns {boolean} true if modern syntax is supported, false otherwise
 */
function supportsModernMaplibre () {
  return typeof ''.replaceAll === 'function'
}

/**
 * Creates a MapLibre provider descriptor for lazy-loading the map provider.
 *
 * @param {Partial<MapProviderConfig>} [config={}] - Optional provider configuration overrides.
 * @returns {MapProviderDescriptor} The map provider descriptor.
 */
export default function createMapLibreProvider (config = {}) {
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
