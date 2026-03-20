import createMapLibreProvider from './index.js'
import { getWebGL } from './utils/detectWebgl.js'

jest.mock('./utils/detectWebgl.js', () => ({ getWebGL: jest.fn() }))
jest.mock('maplibre-gl', () => ({ VERSION: '3.x' }))
jest.mock('./maplibreProvider.js', () => ({ default: class MockProvider {} }))

describe('createMapLibreProvider', () => {
  beforeEach(() => {
    getWebGL.mockReturnValue({ isEnabled: true, error: null })

    // Ensure modern support by default
    String.prototype.replaceAll = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('checkDeviceCapabilities: WebGL enabled, modern browser, no IE → isSupported true', () => {
    const result = createMapLibreProvider().checkDeviceCapabilities()

    expect(result.isSupported).toBe(true)
    expect(result.error).toBeFalsy()
    expect(getWebGL).toHaveBeenCalledWith(['webgl2', 'webgl1'])
  })

  test('checkDeviceCapabilities: WebGL disabled → isSupported false, returns webGL error', () => {
    getWebGL.mockReturnValue({ isEnabled: false, error: 'WebGL not supported' })

    const result = createMapLibreProvider().checkDeviceCapabilities()

    expect(result.isSupported).toBe(false)
    expect(result.error).toBe('WebGL not supported')
  })

  test('checkDeviceCapabilities: IE detected → error is IE message', () => {
    Object.defineProperty(document, 'documentMode', {
      get: () => 11,
      configurable: true
    })

    try {
      const result = createMapLibreProvider().checkDeviceCapabilities()
      expect(result.error).toBe('Internet Explorer is not supported')
    } finally {
      Object.defineProperty(document, 'documentMode', {
        get: () => undefined,
        configurable: true
      })
    }
  })

  test('checkDeviceCapabilities: no replaceAll support → isSupported false', () => {
    delete String.prototype.replaceAll

    const result = createMapLibreProvider().checkDeviceCapabilities()

    expect(result.isSupported).toBe(false)
  })

  test('load returns MapProvider, mapFramework, and merged mapProviderConfig', async () => {
    const result = await createMapLibreProvider({ tileSize: 512 }).load()

    expect(result.MapProvider).toBeDefined()
    expect(result.mapFramework).toBeDefined()
    expect(result.mapProviderConfig).toEqual({
      tileSize: 512,
      crs: 'EPSG:4326'
    })
  })

  test('load uses empty default config', async () => {
    const { mapProviderConfig } = await createMapLibreProvider().load()

    expect(mapProviderConfig).toEqual({ crs: 'EPSG:4326' })
  })
})
