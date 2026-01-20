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
      config: { behaviour: 'buttonFirst', hybridWidth: null, maxMobileWidth: 640 },
      rootEl: document.createElement('div'),
      loadApp: jest.fn(),
      removeApp: jest.fn(),
      openButton: { focus: jest.fn() }
    }
    component2 = {
      id: 'list',
      config: { behaviour: 'hybrid', hybridWidth: null, maxMobileWidth: 640 },
      rootEl: document.createElement('div'),
      loadApp: jest.fn(),
      removeApp: jest.fn(),
      openButton: { focus: jest.fn() }
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

  it('removes component and focuses button when view param does not match', () => {
    component1.rootEl.appendChild(document.createElement('div'))
    historyManager.register(component1)
    queryString.getQueryParam.mockReturnValue(null)

    window.dispatchEvent(popstateEvent)

    expect(component1.removeApp).toHaveBeenCalled()
    expect(component1.openButton.focus).toHaveBeenCalled()
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
    component2.rootEl.appendChild(document.createElement('div'))
    historyManager.register(component2)
    queryString.getQueryParam.mockReturnValue(null)
    // Viewport is narrow - hybrid is in fullscreen/buttonFirst mode
    window.matchMedia = jest.fn().mockImplementation(() => ({ matches: true }))

    window.dispatchEvent(popstateEvent)

    expect(component2.removeApp).toHaveBeenCalled()
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
