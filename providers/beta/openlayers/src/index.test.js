import createOpenLayersProvider from './index.js'

describe('createOpenLayersProvider checkDeviceCapabilities', () => {
  test('modern browser with canvas → isSupported true', () => {
    const result = createOpenLayersProvider().checkDeviceCapabilities()

    expect(result.isSupported).toBe(true)
    expect(result.error).toBeFalsy()
  })

  test('Internet Explorer → isSupported false', () => {
    Object.defineProperty(document, 'documentMode', { get: () => 11, configurable: true })

    try {
      const result = createOpenLayersProvider().checkDeviceCapabilities()
      expect(result.isSupported).toBe(false)
      expect(result.error).toBe('Internet Explorer is not supported')
    } finally {
      Object.defineProperty(document, 'documentMode', { get: () => undefined, configurable: true })
    }
  })

  test('no canvas support → isSupported false', () => {
    const createElement = jest.spyOn(document, 'createElement').mockReturnValue({})

    try {
      const result = createOpenLayersProvider().checkDeviceCapabilities()
      expect(result.isSupported).toBe(false)
      expect(result.error).toBe('Canvas is not supported in this browser')
    } finally {
      createElement.mockRestore()
    }
  })

  test('no Array.prototype.at → isSupported false', () => {
    const restoreAt = Array.prototype.at
    delete Array.prototype.at // eslint-disable-line no-extend-native

    try {
      const result = createOpenLayersProvider().checkDeviceCapabilities()
      expect(result.isSupported).toBe(false)
      expect(result.error).toBe('Browser does not support the JavaScript features OpenLayers requires')
    } finally {
      Array.prototype.at = restoreAt // eslint-disable-line no-extend-native
    }
  })
})
