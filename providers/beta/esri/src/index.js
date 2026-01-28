import { getWebGL } from './utils/detectWebGL.js'

const browser = {
  isIE: document.documentMode,
  error: 'Internet Explorer is not supported'
}

const arrayFindLast = {
  isSupported: !!Array.prototype.findLast,
  error: 'Array.FindLast() is not supported'
}

const webGL = getWebGL(['webgl2', 'webgl1'])

// ESRI provider descriptor
export default function (config = {}) {
  return {
    checkDeviceCapabilities: () => {
      return {
        isSupported: arrayFindLast.isSupported && webGL.isEnabled && !browser.isIE,
        error: browser.error || arrayFindLast.error || webGL.error
      }
    },
    load: async () => {
      const mapProviderConfig = {
        ...config,
        crs: 'EPSG:27700'
      }

      try {
        const MapProvider = (await import(/* webpackChunkName: "im-esri-provider" */ './esriProvider.js')).default

        return {
          MapProvider,
          mapProviderConfig
        }
      } catch (error) {
        console.error('Failed to load map provider', error)
        throw error
      }
    }
  }
}
