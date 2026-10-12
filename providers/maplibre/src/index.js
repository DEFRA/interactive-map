/**
 * @typedef {import('../../../src/types.js').MapProviderDescriptor} MapProviderDescriptor
 * @typedef {import('../../../src/types.js').MapProviderLoadResult} MapProviderLoadResult
 * @typedef {import('../../../src/types.js').MapProviderConfig} MapProviderConfig
 * @typedef {import('../../../src/types.js').MaplibreProviderConfig} MaplibreProviderConfig
 */

import { getWebGL } from './utils/detectWebgl.js'
import { supportsModuleWorkers } from './utils/detectModuleWorker.js'
import { getWorkerUrl } from './utils/workerUrl.js'

/**
 * Checks whether the browser can parse and run MapLibre. Its newest syntax is class
 * static blocks (Chrome 94 / Firefox 93 / Safari 16.4), which cannot be detected
 * without `eval`, so two proxies that polyfills don't provide are used:
 * `Intl.supportedValuesOf` (Chrome 99 / Firefox 93) and RegExp lookbehind, which
 * Safari gained in 16.4.
 *
 * @returns {boolean} true if modern syntax is supported, false otherwise
 */
function supportsModernMaplibre () {
  if (typeof Intl?.supportedValuesOf !== 'function') {
    return false
  }
  try {
    return new RegExp('(?<=a)b').test('ab') // eslint-disable-line prefer-regex-literals -- NOSONAR: a literal would be a syntax error in browsers without lookbehind
  } catch (_) { // NOSONAR - a SyntaxError means lookbehind is unsupported
    return false
  }
}

/**
 * Returns the reason the device cannot run MapLibre, or undefined if it can.
 *
 * @returns {string|undefined}
 */
function getUnsupportedReason () {
  if (document.documentMode) {
    return 'Internet Explorer is not supported'
  }
  const webGL = getWebGL(['webgl2'])
  if (!webGL.isEnabled) {
    return webGL.error
  }
  if (!supportsModernMaplibre()) {
    return 'Browser does not support the JavaScript features MapLibre requires'
  }
  if (!supportsModuleWorkers()) {
    return 'Browser does not support module workers'
  }
  return undefined
}

/**
 * Creates a MapLibre provider descriptor for lazy-loading the map provider.
 *
 * @param {MaplibreProviderConfig} [config={}] - Optional provider configuration overrides.
 * @returns {MapProviderDescriptor} The map provider descriptor.
 */
export default function createMapLibreProvider (config = {}) {
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
      const mapFramework = await import(/* webpackChunkName: "im-maplibre-framework" */ 'maplibre-gl')

      mapFramework.setWorkerUrl(config.workerUrl || getWorkerUrl(mapFramework.getVersion()))

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
