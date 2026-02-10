/**
 * @typedef {import('../../../src/types.js').MapProviderDescriptor} MapProviderDescriptor
 * @typedef {import('../../../src/types.js').MapProviderLoadResult} MapProviderLoadResult
 * @typedef {import('../../../src/types.js').MapProviderConfig} MapProviderConfig
 */

import { getWebGL } from './utils/detectWebgl.js'

const isLatest = !!window.globalThis

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
        isSupported: webGL.isEnabled,
        error: (isIE && 'Internet Explorer is not supported') || webGL.error
      }
    },
    /** @returns {Promise<MapProviderLoadResult>} */
    load: async () => {
      let mapFramework
      if (isLatest) {
        const maplibre = await import(/* webpackChunkName: "im-maplibre-framework" */ 'maplibre-gl')
        mapFramework = maplibre
      } else {
        const [maplibreLegacy] = await Promise.all([
          import(/* webpackChunkName: "im-maplibre-legacy-framework" */ 'maplibre-gl-legacy'),
          import(/* webpackChunkName: "im-maplibre-legacy-framework" */ 'core-js/es/array/flat.js')
        ])
        mapFramework = maplibreLegacy
      }

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
