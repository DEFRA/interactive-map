import createMapLibreProvider from './index.js'
import { getWebGL } from './utils/detectWebgl.js'
import { supportsModuleWorkers } from './utils/detectModuleWorker.js'
import * as maplibreGl from 'maplibre-gl'

jest.mock('./utils/detectWebgl.js', () => ({ getWebGL: jest.fn() }))
jest.mock('./utils/detectModuleWorker.js', () => ({ supportsModuleWorkers: jest.fn() }))
jest.mock('./utils/workerUrl.js', () => ({ getWorkerUrl: (version) => `http://localhost/maplibre-gl-worker.mjs?v=${version}` }))
jest.mock('maplibre-gl', () => ({ getVersion: () => '6.0.0', setWorkerUrl: jest.fn() }))
jest.mock('./maplibreProvider.js', () => ({ default: class MockProvider {} }))

describe('createMapLibreProvider', () => {
  beforeEach(() => {
    getWebGL.mockReturnValue({ isEnabled: true, error: null })
    supportsModuleWorkers.mockReturnValue(true)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('checkDeviceCapabilities: WebGL2, modern browser, module workers, no IE → isSupported true', () => {
    const result = createMapLibreProvider().checkDeviceCapabilities()

    expect(result.isSupported).toBe(true)
    expect(result.error).toBeFalsy()
    expect(getWebGL).toHaveBeenCalledWith(['webgl2'])
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
      expect(result.isSupported).toBe(false)
      expect(result.error).toBe('Internet Explorer is not supported')
    } finally {
      Object.defineProperty(document, 'documentMode', {
        get: () => undefined,
        configurable: true
      })
    }
  })

  // Not Object.hasOwn: polyfills.js adds it before this check runs
  test('checkDeviceCapabilities: no Intl.supportedValuesOf → isSupported false', () => {
    const restoreSupportedValuesOf = Intl.supportedValuesOf
    delete Intl.supportedValuesOf

    try {
      const result = createMapLibreProvider().checkDeviceCapabilities()
      expect(result.isSupported).toBe(false)
      expect(result.error).toBe('Browser does not support the JavaScript features MapLibre requires')
    } finally {
      Intl.supportedValuesOf = restoreSupportedValuesOf
    }
  })

  test('checkDeviceCapabilities: no RegExp lookbehind → isSupported false', () => {
    const NativeRegExp = globalThis.RegExp
    globalThis.RegExp = function () { throw new SyntaxError('Invalid regular expression') }

    try {
      const result = createMapLibreProvider().checkDeviceCapabilities()
      expect(result.isSupported).toBe(false)
      expect(result.error).toBe('Browser does not support the JavaScript features MapLibre requires')
    } finally {
      globalThis.RegExp = NativeRegExp
    }
  })

  test('checkDeviceCapabilities: no module workers → isSupported false', () => {
    supportsModuleWorkers.mockReturnValue(false)

    const result = createMapLibreProvider().checkDeviceCapabilities()

    expect(result.isSupported).toBe(false)
    expect(result.error).toBe('Browser does not support module workers')
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

  test('load sets the configured workerUrl when provided', async () => {
    await createMapLibreProvider({ workerUrl: '/assets/maplibre-gl-worker.mjs' }).load()

    expect(maplibreGl.setWorkerUrl).toHaveBeenCalledWith('/assets/maplibre-gl-worker.mjs')
  })

  test('load sets the bundled worker URL when workerUrl is not provided', async () => {
    await createMapLibreProvider().load()

    expect(maplibreGl.setWorkerUrl).toHaveBeenCalledWith('http://localhost/maplibre-gl-worker.mjs?v=6.0.0')
  })
})
