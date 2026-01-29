import { getWebGL } from './utils/detectWebgl.js'

const isLatest = !!window.globalThis

// MapLibre provider descriptor
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
    load: async () => {
      let mapFramework
      if (isLatest) {
        const maplibre = await import(/* webpackChunkName: "im-maplibre-framework" */ 'maplibre-gl')
        mapFramework = maplibre
      } else {
        const [maplibreLegacy, resizeObserver] = await Promise.all([
          import(/* webpackChunkName: "im-maplibre-legacy-framework" */ 'maplibre-gl-legacy'),
          import(/* webpackChunkName: "im-maplibre-legacy-framework" */ 'resize-observer'),
          import(/* webpackChunkName: "im-maplibre-legacy-framework" */ 'core-js/es/array/flat.js')
        ])
        if (!window.ResizeObserver) {
          resizeObserver.install()
        }
        mapFramework = maplibreLegacy
      }

      const MapProvider = (await import(/* webpackChunkName: "im-maplibre-provider" */ './maplibreProvider.js')).default

      /** @type {"EPSG:4326" | "EPSG:27700"} */
      const crs = 'EPSG:4326'
      
      const mapProviderConfig = {
        ...config,
        crs
      }

      return {
        MapProvider,
        mapProviderConfig,
        mapFramework
      }
    }
  }
}
