/**
 * @jest-environment jsdom
 */

import historyManager from './historyManager.js'
import * as queryString from '../utils/queryString.js'

jest.mock('../utils/queryString.js')

describe('historyManager', () => {
  let component1, component2, popstateEvent

  beforeEach(() => {
    component1 = {
      id: 'map',
      config: { behaviour: 'buttonFirst', hybridWidth: null, maxMobileWidth: 640, preserveStateOnClose: false },
      rootEl: document.createElement('div'),
      loadApp: jest.fn(),
      removeApp: jest.fn(),
      hideApp: jest.fn(),
      showApp: jest.fn(),
      openButton: { focus: jest.fn() },
      _isHidden: false
    }
    component2 = {
      id: 'list',
      config: { behaviour: 'hybrid', hybridWidth: null, maxMobileWidth: 640, preserveStateOnClose: false },
      rootEl: document.createElement('div'),
      loadApp: jest.fn(),
      removeApp: jest.fn(),
      hideApp: jest.fn(),
      showApp: jest.fn(),
      openButton: { focus: jest.fn() },
      _isHidden: false
    }
    popstateEvent = new PopStateEvent('popstate')
    jest.clearAllMocks()
    // Default: viewport is wide (media query doesn't match)
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false
    }))
  })

  it('registers component and initializes popstate listener on first registration', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener')

    historyManager.register(component1)

    expect(addEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function))
    addEventListenerSpy.mockRestore()
  })

  it('loads component when view param matches and component is not open', () => {
    historyManager.register(component1)
    queryString.getQueryParam.mockReturnValue('map')

    window.dispatchEvent(popstateEvent)

    expect(component1.loadApp).toHaveBeenCalled()
  })

  it('does not load component when already open', () => {
    component1.rootEl.appendChild(document.createElement('div'))
    historyManager.register(component1)
    queryString.getQueryParam.mockReturnValue('map')

    window.dispatchEvent(popstateEvent)

    expect(component1.loadApp).not.toHaveBeenCalled()
  })

  it('removes component when view param does not match and preserveStateOnClose is false', () => {
    component1.config.preserveStateOnClose = false
    component1.rootEl.appendChild(document.createElement('div'))
    historyManager.register(component1)
    queryString.getQueryParam.mockReturnValue(null)

    window.dispatchEvent(popstateEvent)

    expect(component1.removeApp).toHaveBeenCalled()
    expect(component1.hideApp).not.toHaveBeenCalled()
  })

  it('hides component when view param does not match and preserveStateOnClose is true', () => {
    component1.config.preserveStateOnClose = true
    component1.rootEl.appendChild(document.createElement('div'))
    historyManager.register(component1)
    queryString.getQueryParam.mockReturnValue(null)

    window.dispatchEvent(popstateEvent)

    expect(component1.hideApp).toHaveBeenCalled()
    expect(component1.removeApp).not.toHaveBeenCalled()
  })

  it('does not remove hybrid component when viewport is wide (inline mode)', () => {
    component2.rootEl.appendChild(document.createElement('div'))
    historyManager.register(component2)
    queryString.getQueryParam.mockReturnValue(null)
    // Viewport is wide - hybrid is visible inline
    window.matchMedia = jest.fn().mockImplementation(() => ({ matches: false }))

    window.dispatchEvent(popstateEvent)

    expect(component2.removeApp).not.toHaveBeenCalled()
  })

  it('removes hybrid component when viewport is narrow and view does not match', () => {
    component2.config.preserveStateOnClose = false
    component2.rootEl.appendChild(document.createElement('div'))
    historyManager.register(component2)
    queryString.getQueryParam.mockReturnValue(null)
    // Viewport is narrow - hybrid is in fullscreen/buttonFirst mode
    window.matchMedia = jest.fn().mockImplementation(() => ({ matches: true }))

    window.dispatchEvent(popstateEvent)

    expect(component2.removeApp).toHaveBeenCalled()
  })

  it('calls showApp when view param matches and component is hidden', () => {
    component1._isHidden = true
    historyManager.register(component1)
    queryString.getQueryParam.mockReturnValue('map')

    window.dispatchEvent(popstateEvent)

    expect(component1.showApp).toHaveBeenCalled()
    expect(component1.loadApp).not.toHaveBeenCalled()
  })

  it('uses hybridWidth for media query when provided', () => {
    component2.config.hybridWidth = 768
    component2.rootEl.appendChild(document.createElement('div'))
    historyManager.register(component2)
    queryString.getQueryParam.mockReturnValue(null)
    window.matchMedia = jest.fn().mockImplementation(() => ({ matches: false }))

    window.dispatchEvent(popstateEvent)

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)')
  })

  it('unregisters component', () => {
    historyManager.register(component1)
    component1.rootEl.appendChild(document.createElement('div'))
    historyManager.unregister(component1)

    queryString.getQueryParam.mockReturnValue('map')
    window.dispatchEvent(popstateEvent)

    expect(component1.loadApp).not.toHaveBeenCalled()
  })
})
