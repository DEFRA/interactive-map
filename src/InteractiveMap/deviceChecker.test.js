import { checkDeviceSupport } from './deviceChecker.js'
import { renderError } from './renderError.js'
import { removeLoadingState } from './domStateManager.js'

jest.mock('./renderError.js')
jest.mock('./domStateManager.js')

describe('checkDeviceSupport', () => {
  let rootEl, config, consoleLogSpy

  beforeEach(() => {
    rootEl = document.createElement('div')
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    jest.clearAllMocks()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  it('returns true when device is supported', () => {
    config = {
      mapProvider: {
        checkDeviceCapabilities: jest.fn().mockReturnValue({ isSupported: true })
      },
      deviceNotSupportedText: 'Not supported'
    }

    expect(checkDeviceSupport(rootEl, config)).toBe(true)
    expect(renderError).not.toHaveBeenCalled()
    expect(removeLoadingState).not.toHaveBeenCalled()
    expect(console.log).not.toHaveBeenCalled()
  })

  it('returns false and shows error when device is not supported', () => {
    config = {
      mapProvider: {
        checkDeviceCapabilities: jest.fn().mockReturnValue({
          isSupported: false,
          error: 'WebGL not available'
        })
      },
      deviceNotSupportedText: 'Device not supported'
    }

    expect(checkDeviceSupport(rootEl, config)).toBe(false)
    expect(renderError).toHaveBeenCalledWith(rootEl, 'Device not supported')
    expect(removeLoadingState).toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith('WebGL not available')
  })

  it('logs "No map provider" and returns false if mapProvider is missing', () => {
    config = {
      mapProvider: null,
      deviceNotSupportedText: 'Device not supported'
    }

    expect(checkDeviceSupport(rootEl, config)).toBe(false)
    expect(console.log).toHaveBeenCalledWith('No map provider')
    expect(renderError).not.toHaveBeenCalled()
    expect(removeLoadingState).not.toHaveBeenCalled()
  })

  it('returns false if checkDeviceCapabilities returns undefined', () => {
    config = {
      mapProvider: {
        checkDeviceCapabilities: jest.fn().mockReturnValue(undefined)
      },
      deviceNotSupportedText: 'Device not supported'
    }

    expect(checkDeviceSupport(rootEl, config)).toBe(false)
    expect(renderError).toHaveBeenCalledWith(rootEl, 'Device not supported')
    expect(removeLoadingState).toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith(undefined)
  })
})
