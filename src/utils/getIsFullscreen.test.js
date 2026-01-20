/**
 * @jest-environment jsdom
 */

import { getIsFullscreen, isHybridFullscreen } from './getIsFullscreen.js'

describe('isHybridFullscreen', () => {
  beforeEach(() => {
    // Reset matchMedia mock before each test
    window.matchMedia = jest.fn()
  })

  it('returns false when behaviour is not hybrid', () => {
    const config = { behaviour: 'inline', hybridWidth: null, maxMobileWidth: 640 }
    expect(isHybridFullscreen(config)).toBe(false)
  })

  it('returns true when behaviour is hybrid and media query matches (viewport <= threshold)', () => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: true
    }))
    const config = { behaviour: 'hybrid', hybridWidth: null, maxMobileWidth: 640 }
    expect(isHybridFullscreen(config)).toBe(true)
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 640px)')
  })

  it('returns false when behaviour is hybrid and media query does not match (viewport > threshold)', () => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false
    }))
    const config = { behaviour: 'hybrid', hybridWidth: null, maxMobileWidth: 640 }
    expect(isHybridFullscreen(config)).toBe(false)
  })

  it('uses hybridWidth when provided instead of maxMobileWidth', () => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: true
    }))
    const config = { behaviour: 'hybrid', hybridWidth: 768, maxMobileWidth: 640 }
    isHybridFullscreen(config)
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)')
  })
})

describe('getIsFullscreen', () => {
  beforeEach(() => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false
    }))
  })

  it.each([
    // --- True Cases ---
    // mapOnly and buttonFirst are always fullscreen
    ['mapOnly', false],
    ['buttonFirst', false]
  ])('should return true for behaviour: %s (always fullscreen)', (behaviour, mediaMatches) => {
    window.matchMedia = jest.fn().mockImplementation(() => ({ matches: mediaMatches }))
    const config = { behaviour, hybridWidth: null, maxMobileWidth: 640 }
    expect(getIsFullscreen(config)).toBe(true)
  })

  it('should return true for hybrid when media query matches', () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({ matches: true }))
    const config = { behaviour: 'hybrid', hybridWidth: null, maxMobileWidth: 640 }
    expect(getIsFullscreen(config)).toBe(true)
  })

  it('should return false for hybrid when media query does not match', () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({ matches: false }))
    const config = { behaviour: 'hybrid', hybridWidth: null, maxMobileWidth: 640 }
    expect(getIsFullscreen(config)).toBe(false)
  })

  it('should return false for inline behaviour', () => {
    const config = { behaviour: 'inline', hybridWidth: null, maxMobileWidth: 640 }
    expect(getIsFullscreen(config)).toBe(false)
  })

  it('should return false for unknown behaviour', () => {
    const config = { behaviour: 'someOtherValue', hybridWidth: null, maxMobileWidth: 640 }
    expect(getIsFullscreen(config)).toBe(false)
  })
})
