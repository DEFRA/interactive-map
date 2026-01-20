/**
 * @jest-environment jsdom
 */

import { updateDOMState, removeLoadingState } from './domStateManager.js'
import * as queryString from '../utils/queryString.js'
import * as toggleInertElements from '../utils/toggleInertElements.js'

jest.mock('../utils/queryString.js')
jest.mock('../utils/toggleInertElements.js')

describe('updateDOMState', () => {
  let mapInstance, rootEl

  beforeEach(() => {
    rootEl = document.createElement('div')
    document.body.appendChild(rootEl)
    document.title = 'Original Title'
    mapInstance = {
      config: {
        id: 'map',
        pageTitle: 'Map View',
        behaviour: 'mapOnly',
        containerHeight: '500px',
        hybridWidth: null,
        maxMobileWidth: 640
      },
      rootEl
    }
    jest.clearAllMocks()
    // Default: viewport is wide (media query doesn't match)
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false
    }))
  })

  afterEach(() => {
    document.body.innerHTML = ''
    document.documentElement.classList.remove('im-is-fullscreen')
    rootEl.classList.remove('im-is-fullscreen')
  })

  it.each([
    // [behaviour, mediaMatches, viewParam, expectedFullscreen, expectedHeight, expectedTitleUpdated]
    ['mapOnly', false, null, true, '100%', false],
    ['buttonFirst', false, null, false, 'auto', false],
    ['buttonFirst', false, 'map', true, '100%', true],
    ['inline', false, null, false, '500px', false]
  ])('%s with mediaMatches=%s and view=%s', (behaviour, mediaMatches, viewParam, isFullscreen, height, titleUpdated) => {
    mapInstance.config.behaviour = behaviour
    window.matchMedia = jest.fn().mockImplementation(() => ({ matches: mediaMatches }))
    queryString.getQueryParam.mockReturnValue(viewParam)

    updateDOMState(mapInstance)

    expect(document.documentElement.classList.contains('im-is-fullscreen')).toBe(isFullscreen)
    if (behaviour !== 'inline') {
      expect(rootEl.classList.contains('im-is-fullscreen')).toBe(isFullscreen)
    }
    expect(rootEl.style.height).toBe(height)
    if (titleUpdated) {
      expect(document.title).toBe('Map View: Original Title')
    }
    if (behaviour !== 'inline') {
      expect(toggleInertElements.toggleInertElements).toHaveBeenCalledWith({
        containerEl: rootEl,
        isFullscreen
      })
    }
  })

  describe('hybrid behaviour', () => {
    beforeEach(() => {
      mapInstance.config.behaviour = 'hybrid'
    })

    it('shows inline (not fullscreen) when viewport is wide', () => {
      window.matchMedia = jest.fn().mockImplementation(() => ({ matches: false }))
      queryString.getQueryParam.mockReturnValue(null)

      updateDOMState(mapInstance)

      expect(document.documentElement.classList.contains('im-is-fullscreen')).toBe(false)
      expect(rootEl.style.height).toBe('500px')
    })

    it('uses auto height when viewport is narrow (hybrid fullscreen mode)', () => {
      window.matchMedia = jest.fn().mockImplementation(() => ({ matches: true }))
      queryString.getQueryParam.mockReturnValue(null)

      updateDOMState(mapInstance)

      expect(rootEl.style.height).toBe('auto')
    })

    it('shows fullscreen when viewport is narrow and view param matches', () => {
      window.matchMedia = jest.fn().mockImplementation(() => ({ matches: true }))
      queryString.getQueryParam.mockReturnValue('map')

      updateDOMState(mapInstance)

      expect(document.documentElement.classList.contains('im-is-fullscreen')).toBe(true)
      expect(rootEl.classList.contains('im-is-fullscreen')).toBe(true)
      expect(rootEl.style.height).toBe('100%')
      expect(document.title).toBe('Map View: Original Title')
    })

    it('uses hybridWidth for media query when provided', () => {
      mapInstance.config.hybridWidth = 768
      window.matchMedia = jest.fn().mockImplementation(() => ({ matches: true }))
      queryString.getQueryParam.mockReturnValue(null)

      updateDOMState(mapInstance)

      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)')
    })
  })
})

describe('removeLoadingState', () => {
  it('removes im-is-loading class from body', () => {
    document.body.classList.add('im-is-loading')
    removeLoadingState()
    expect(document.body.classList.contains('im-is-loading')).toBe(false)
  })
})
