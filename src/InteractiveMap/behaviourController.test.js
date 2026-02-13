/**
 * @jest-environment jsdom
 */

import { setupBehavior, shouldLoadComponent } from './behaviourController.js'
import * as queryString from '../utils/queryString.js'
import { updateDOMState } from './domStateManager.js'

jest.mock('../utils/queryString.js')
jest.mock('./domStateManager.js', () => ({ updateDOMState: jest.fn() }))

describe('shouldLoadComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    queryString.getQueryParam.mockReturnValue(null)
    // Default: viewport is wide (not matching mobile media query)
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }))
  })

  it.each([
    ['mapOnly', true],
    ['inline', true],
    ['buttonFirst', false]
  ])('returns %s for %s behaviour', (behaviour, expected) => {
    const config = { id: 'test', behaviour, hybridWidth: null, maxMobileWidth: 640 }
    expect(shouldLoadComponent(config)).toBe(expected)
  })

  it('returns true for hybrid when viewport is wide (media query does not match)', () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({ matches: false }))
    const config = { id: 'test', behaviour: 'hybrid', hybridWidth: null, maxMobileWidth: 640 }
    expect(shouldLoadComponent(config)).toBe(true)
  })

  it('returns false for hybrid when viewport is narrow (media query matches)', () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({ matches: true }))
    const config = { id: 'test', behaviour: 'hybrid', hybridWidth: null, maxMobileWidth: 640 }
    expect(shouldLoadComponent(config)).toBe(false)
  })

  it('returns true when view param matches id', () => {
    queryString.getQueryParam.mockReturnValue('test')
    const config = { id: 'test', behaviour: 'buttonFirst', hybridWidth: null, maxMobileWidth: 640 }
    expect(shouldLoadComponent(config)).toBe(true)
  })
})

describe('setupBehavior', () => {
  let mockMapInstance, mockBreakpointDetector, breakpointCallback

  beforeEach(() => {
    jest.clearAllMocks()
    mockBreakpointDetector = {
      getBreakpoint: jest.fn(() => 'desktop'),
      subscribe: jest.fn(cb => { breakpointCallback = cb }),
      destroy: jest.fn()
    }
    mockMapInstance = {
      config: { hybridWidth: null, maxMobileWidth: 640 },
      _breakpointDetector: mockBreakpointDetector,
      _root: null,
      _isHidden: false,
      loadApp: jest.fn(),
      removeApp: jest.fn(),
      hideApp: jest.fn(),
      showApp: jest.fn()
    }
    // Default: viewport is wide
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }))
  })

  it('subscribes to breakpoint changes for buttonFirst behaviour', () => {
    mockMapInstance.config = { behaviour: 'buttonFirst', hybridWidth: null, maxMobileWidth: 640 }
    setupBehavior(mockMapInstance)
    expect(mockBreakpointDetector.subscribe).toHaveBeenCalled()
  })

  it('subscribes to media query changes for hybrid behaviour', () => {
    const mockAddEventListener = jest.fn()
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: mockAddEventListener,
      removeEventListener: jest.fn()
    }))
    mockMapInstance.config = { behaviour: 'hybrid', hybridWidth: null, maxMobileWidth: 640 }
    setupBehavior(mockMapInstance)
    expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(mockBreakpointDetector.subscribe).not.toHaveBeenCalled()
  })

  it('uses hybridWidth for media query when provided', () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }))
    mockMapInstance.config = { behaviour: 'hybrid', hybridWidth: 768, maxMobileWidth: 640 }
    setupBehavior(mockMapInstance)
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)')
  })

  it('does not subscribe for mapOnly', () => {
    mockMapInstance.config = { behaviour: 'mapOnly', hybridWidth: null, maxMobileWidth: 640 }
    setupBehavior(mockMapInstance)
    expect(mockBreakpointDetector.subscribe).not.toHaveBeenCalled()
  })

  it('does not subscribe for inline', () => {
    mockMapInstance.config = { behaviour: 'inline', hybridWidth: null, maxMobileWidth: 640 }
    setupBehavior(mockMapInstance)
    expect(mockBreakpointDetector.subscribe).not.toHaveBeenCalled()
  })

  it('loads/removes component based on shouldLoadComponent for buttonFirst', () => {
    mockMapInstance.config = { id: 'test', behaviour: 'buttonFirst', hybridWidth: null, maxMobileWidth: 640 }
    setupBehavior(mockMapInstance)

    queryString.getQueryParam.mockReturnValue('test')
    breakpointCallback()
    expect(mockMapInstance.loadApp).toHaveBeenCalled()

    queryString.getQueryParam.mockReturnValue(null)
    breakpointCallback()
    expect(mockMapInstance.removeApp).toHaveBeenCalled()
  })

  it('returns cleanup function for hybrid behaviour', () => {
    const mockRemoveEventListener = jest.fn()
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: mockRemoveEventListener
    }))
    mockMapInstance.config = { behaviour: 'hybrid', hybridWidth: null, maxMobileWidth: 640 }
    const cleanup = setupBehavior(mockMapInstance)
    expect(typeof cleanup).toBe('function')
    cleanup()
    expect(mockRemoveEventListener).toHaveBeenCalled()
  })

  it('returns null for non-hybrid/buttonFirst behaviours', () => {
    mockMapInstance.config = { behaviour: 'inline', hybridWidth: null, maxMobileWidth: 640 }
    const cleanup = setupBehavior(mockMapInstance)
    expect(cleanup).toBeNull()
  })

  describe('hybrid behaviour handleChange', () => {
    let handleChange

    beforeEach(() => {
      const mockAddEventListener = jest.fn((event, cb) => { handleChange = cb })
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: mockAddEventListener,
        removeEventListener: jest.fn()
      }))
      mockMapInstance.config = { id: 'test', behaviour: 'hybrid', hybridWidth: null, maxMobileWidth: 640 }
      setupBehavior(mockMapInstance)
    })

    it('calls showApp when map is hidden and should load', () => {
      mockMapInstance._isHidden = true
      queryString.getQueryParam.mockReturnValue(null) // wide viewport, should load

      handleChange()

      expect(mockMapInstance.showApp).toHaveBeenCalled()
      expect(mockMapInstance.loadApp).not.toHaveBeenCalled()
    })

    it('calls loadApp when map has no root and should load', () => {
      mockMapInstance._isHidden = false
      mockMapInstance._root = null
      queryString.getQueryParam.mockReturnValue(null)

      handleChange()

      expect(mockMapInstance.loadApp).toHaveBeenCalled()
      expect(mockMapInstance.showApp).not.toHaveBeenCalled()
    })

    it('calls updateDOMState when map is showing and should load', () => {
      mockMapInstance._isHidden = false
      mockMapInstance._root = {} // has root
      queryString.getQueryParam.mockReturnValue(null)

      handleChange()

      expect(updateDOMState).toHaveBeenCalledWith(mockMapInstance)
      expect(mockMapInstance.loadApp).not.toHaveBeenCalled()
      expect(mockMapInstance.showApp).not.toHaveBeenCalled()
    })

    it('calls hideApp when should not load and has root', () => {
      mockMapInstance._root = {}
      // Simulate narrow viewport where shouldLoadComponent returns false
      window.matchMedia = jest.fn().mockImplementation(() => ({ matches: true }))
      queryString.getQueryParam.mockReturnValue(null)

      handleChange()

      expect(mockMapInstance.hideApp).toHaveBeenCalled()
    })

    it('does nothing when should not load and map has no root', () => {
      mockMapInstance._root = null
      mockMapInstance._isHidden = false

      // Force shouldLoadComponent === false
      window.matchMedia = jest.fn().mockImplementation(() => ({ matches: true }))
      queryString.getQueryParam.mockReturnValue(null)

      handleChange()

      expect(mockMapInstance.hideApp).not.toHaveBeenCalled()
      expect(mockMapInstance.loadApp).not.toHaveBeenCalled()
      expect(mockMapInstance.showApp).not.toHaveBeenCalled()
      expect(updateDOMState).not.toHaveBeenCalled()
    })
  })
})
