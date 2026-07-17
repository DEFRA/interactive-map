import { checkDeviceSupport } from './deviceChecker.js'
import { renderError } from './renderError.js'
import { removeLoadingState } from './domStateManager.js'
import { logger } from '../services/logger.js'

jest.mock('./renderError.js')
jest.mock('./domStateManager.js')
jest.mock('../services/logger.js')

describe('checkDeviceSupport', () => {
  let rootEl, config

  beforeEach(() => {
    rootEl = document.createElement('div')
    jest.clearAllMocks()
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
    expect(logger.warn).not.toHaveBeenCalled()
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
    expect(logger.warn).toHaveBeenCalledWith('WebGL not available')
  })

  it('logs "No map provider" and returns false if mapProvider is missing', () => {
    config = {
      mapProvider: null,
      deviceNotSupportedText: 'Device not supported'
    }

    expect(checkDeviceSupport(rootEl, config)).toBe(false)
    expect(logger.warn).toHaveBeenCalledWith('No map provider')
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
    expect(logger.warn).toHaveBeenCalledWith(undefined)
  })
})
