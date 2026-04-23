// reverseGeocode.test.js
import { createReverseGeocode, reverseGeocode, hasReverseGeocode } from './reverseGeocode'

describe('reverseGeocode module', () => {
  beforeEach(() => {
    // Reset the internal reverseGeocodeFn by resetting the module
    jest.resetModules()
  })

  it('throws if reverseGeocodeFn is not initialised', () => {
    expect(() => reverseGeocode(10, [0, 0])).toThrow('ReverseGeocode not initialised')
  })

  it('hasReverseGeocode returns false before initialisation', () => {
    expect(hasReverseGeocode()).toBe(false)
  })

  it('sets reverseGeocodeFn via createReverseGeocode and calls providerFn correctly', async () => {
    const mockProviderFn = jest.fn().mockResolvedValue('result')

    const provider = {
      load: jest.fn().mockResolvedValue(mockProviderFn)
    }

    const config = {
      url: 'https://example.com',
      transformRequest: jest.fn(),
      load: provider.load
    }

    const crs = 'EPSG:4326'

    createReverseGeocode(config, crs)

    const result = await reverseGeocode(12, [1, 2])

    expect(provider.load).toHaveBeenCalled()

    // providerFn(url, transformRequest, crs, zoom, coord)
    expect(mockProviderFn).toHaveBeenCalledWith(
      config.url,
      config.transformRequest,
      crs,
      12,
      [1, 2]
    )

    expect(result).toBe('result')
  })

  it('hasReverseGeocode returns true after initialisation', () => {
    const config = { url: 'x', transformRequest: jest.fn(), load: jest.fn().mockResolvedValue(jest.fn()) }
    createReverseGeocode(config, 'EPSG:4326')
    expect(hasReverseGeocode()).toBe(true)
  })

  it('supports multiple calls after initialisation', async () => {
    const mockProviderFn = jest.fn().mockResolvedValue('ok')

    const provider = {
      load: jest.fn().mockResolvedValue(mockProviderFn)
    }

    const config = {
      url: 'x',
      transformRequest: null,
      load: provider.load
    }

    createReverseGeocode(config, 'EPSG:3857')

    const r1 = await reverseGeocode(5, [10, 20])
    const r2 = await reverseGeocode(8, [30, 40])

    expect(mockProviderFn).toHaveBeenCalledTimes(2)

    expect(r1).toBe('ok')
    expect(r2).toBe('ok')
  })
})
