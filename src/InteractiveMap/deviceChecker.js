import { renderError } from './renderError.js'
import { removeLoadingState } from './domStateManager.js'

/**
 * Checks if the current device is supported by the map provider.
 *
 * If the device is not supported, this function renders an error message,
 * removes the loading state, and logs the device error to the console.
 *
 * @param {HTMLElement} rootEl - The root element where the error message will be rendered.
 * @param {Object} config - Configuration object.
 * @param {Object} config.mapProvider - Map provider with device capability checks.
 * @param {string} config.deviceNotSupportedText - Message to display if device is unsupported.
 * @returns {boolean} `true` if the device is supported, `false` otherwise.
 */
export function checkDeviceSupport (rootEl, config) {
  const { mapProvider, deviceNotSupportedText } = config
  const device = mapProvider?.checkDeviceCapabilities()

  if (!mapProvider) {
    console.log('No map provider')
    return false
  }

  if (!device?.isSupported) {
    renderError(rootEl, deviceNotSupportedText)
    removeLoadingState()
    console.log(device?.error)
    return false
  }
  return true
}
