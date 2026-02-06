/**
 * @jest-environment jsdom
 */

import InteractiveMap from './InteractiveMap.js'
import historyManager from './historyManager.js'
import { parseDataProperties } from './parseDataProperties.js'
import { checkDeviceSupport } from './deviceChecker.js'
import { setupBehavior, shouldLoadComponent } from './behaviourController.js'
import { updateDOMState, removeLoadingState } from './domStateManager.js'
import { renderError } from './renderError.js'
import { createBreakpointDetector } from '../utils/detectBreakpoint.js'
import { createInterfaceDetector } from '../utils/detectInterfaceType.js'
import { createReverseGeocode } from '../services/reverseGeocode.js'

// --- Mocking Setup ---
jest.mock('../scss/main.scss', () => ({}))
jest.mock('./historyManager.js', () => ({ register: jest.fn(), unregister: jest.fn() }))
jest.mock('./parseDataProperties.js', () => ({ parseDataProperties: jest.fn(() => ({})) }))
jest.mock('./deviceChecker.js', () => ({ checkDeviceSupport: jest.fn(() => true) }))
jest.mock('./buttonManager.js')
jest.mock('./behaviourController.js', () => ({
  setupBehavior: jest.fn(),
  shouldLoadComponent: jest.fn(() => true)
}))
jest.mock('./domStateManager.js', () => ({ updateDOMState: jest.fn(), removeLoadingState: jest.fn() }))
jest.mock('./renderError.js', () => ({ renderError: jest.fn() }))
jest.mock('../config/mergeConfig.js', () => ({ mergeConfig: jest.fn(cfg => cfg) }))
const mockBreakpointDetector = {
  subscribe: jest.fn(() => jest.fn()),
  getBreakpoint: jest.fn(() => 'desktop'),
  destroy: jest.fn()
}
const mockInterfaceDetectorCleanup = jest.fn()
jest.mock('../utils/detectBreakpoint.js', () => ({ createBreakpointDetector: jest.fn(() => mockBreakpointDetector) }))
jest.mock('../utils/detectInterfaceType.js', () => ({
  createInterfaceDetector: jest.fn(() => mockInterfaceDetectorCleanup),
  getInterfaceType: jest.fn(() => 'keyboard')
}))
jest.mock('../services/reverseGeocode.js', () => ({ createReverseGeocode: jest.fn() }))
jest.mock('../services/eventBus.js', () => ({
  createEventBus: jest.fn(() => ({ on: jest.fn(), off: jest.fn(), emit: jest.fn(), destroy: jest.fn() })),
  default: { on: jest.fn(), off: jest.fn(), emit: jest.fn(), destroy: jest.fn() }
}))
jest.mock('../App/initialiseApp.js', () => ({ initialiseApp: jest.fn() }))

const { initialiseApp } = require('../App/initialiseApp.js')
const createButtonMock = require('./buttonManager.js').createButton
const mapProviderMock = {
  load: jest.fn().mockResolvedValue({
    MapProvider: {},
    mapFramework: {},
    mapProviderConfig: { crs: 'EPSG:3857' }
  })
}
const mockButtonInstance = { style: {}, removeAttribute: jest.fn(), focus: jest.fn() }

describe('InteractiveMap Core Functionality', () => {
  let rootEl, openButtonCallback

  beforeEach(() => {
    jest.clearAllMocks()
    document.body.innerHTML = '<div id="map"></div>'
    rootEl = document.getElementById('map')
    initialiseApp.mockResolvedValue({ _root: {}, someApi: jest.fn(), unmount: jest.fn() })
    createButtonMock.mockImplementation((config, root, cb) => {
      openButtonCallback = cb
      return mockButtonInstance
    })
  })

  it('throws error if root element not found', () => {
    expect(() => new InteractiveMap('nonexistent')).toThrow(/not found/)
  })

  it('binds eventBus methods (on/off/emit)', () => {
    const map = new InteractiveMap('map', { mapProvider: mapProviderMock })
    expect(typeof map.on).toBe('function')
    expect(typeof map.off).toBe('function')
    expect(typeof map.emit).toBe('function')
  })

  it('returns early from constructor if device not supported', () => {
    checkDeviceSupport.mockReturnValue(false)
    const createMap = () => new InteractiveMap('map', { mapProvider: mapProviderMock })
    expect(createMap).not.toThrow()
    expect(historyManager.register).not.toHaveBeenCalled()
    expect(createBreakpointDetector).not.toHaveBeenCalled()
    expect(createInterfaceDetector).not.toHaveBeenCalled()
  })

  it('registers with historyManager for buttonFirst behaviour', () => {
    checkDeviceSupport.mockReturnValue(true)
    const createMap = () => new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    expect(createMap).not.toThrow()
    expect(historyManager.register).toHaveBeenCalled()
  })

  it('calls breakpoint & interface detectors', () => {
    const createMap = () => new InteractiveMap('map', { mapProvider: mapProviderMock })
    expect(createMap).not.toThrow()
    expect(createBreakpointDetector).toHaveBeenCalled()
    expect(createInterfaceDetector).toHaveBeenCalled()
  })

  it('builds config from dataset and props', () => {
    parseDataProperties.mockReturnValue({ test: 123 })
    const map = new InteractiveMap('map', { custom: 'value', mapProvider: mapProviderMock })
    expect(map.config.test).toBe(123)
    expect(map.config.custom).toBe('value')
  })

  it('creates open button and sets up behavior', () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    expect(createButtonMock).toHaveBeenCalled()
    expect(setupBehavior).toHaveBeenCalledWith(map)
  })

  it('open button click calls _handleButtonClick / loadApp', async () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    const loadSpy = jest.spyOn(map, 'loadApp').mockResolvedValue()
    const pushStateSpy = jest.spyOn(history, 'pushState').mockImplementation(() => {})
    const fakeEvent = { currentTarget: { getAttribute: jest.fn().mockReturnValue('/?mv=map') } }

    await openButtonCallback(fakeEvent)

    expect(loadSpy).toHaveBeenCalled()
    expect(pushStateSpy).toHaveBeenCalledWith({ isBack: true }, '', '/?mv=map')
    loadSpy.mockRestore()
    pushStateSpy.mockRestore()
  })

  it('initializes reverseGeocode if reverseGeocodeProvider is provided', async () => {
    const mapProviderWithCRS = {
      load: jest.fn().mockResolvedValue({
        MapProvider: {},
        mapFramework: {},
        mapProviderConfig: { crs: 'EPSG:27700' }
      })
    }
    const configWithReverse = {
      behaviour: 'buttonFirst',
      mapProvider: mapProviderWithCRS,
      reverseGeocodeProvider: { url: 'https://example.com', apiKey: '123' }
    }
    const map = new InteractiveMap('map', configWithReverse)
    await map.loadApp()
    expect(createReverseGeocode).toHaveBeenCalledWith(configWithReverse.reverseGeocodeProvider, 'EPSG:27700')
  })

  it('calls loadApp if shouldLoadComponent returns true', async () => {
    shouldLoadComponent.mockReturnValue(true)
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    await map.loadApp()
    expect(initialiseApp).toHaveBeenCalled()
  })

  it('does not call loadApp if shouldLoadComponent returns false', () => {
    shouldLoadComponent.mockReturnValue(false)
    const createMap = () => new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    expect(createMap).not.toThrow()
    expect(removeLoadingState).toHaveBeenCalled()
  })

  it('handles loadApp errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const failingProvider = { load: jest.fn().mockRejectedValue(new Error('fail')) }
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: failingProvider, genericErrorText: 'error' })

    await expect(map.loadApp()).rejects.toThrow('fail')
    expect(renderError).toHaveBeenCalledWith(rootEl, 'error')
    consoleErrorSpy.mockRestore()
  })

  it('does not overwrite eventBus methods when merging appInstance', async () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    const originalOn = map.on

    initialiseApp.mockResolvedValue({ _root: {}, on: jest.fn(), off: jest.fn(), emit: jest.fn(), someMethod: jest.fn() })
    await map.loadApp()

    expect(map.on).toBe(originalOn)
    expect(typeof map.someMethod).toBe('function')
  })

  it('removes component and resets DOM/button', () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    map._root = {}
    map.unmount = jest.fn()
    map._openButton = mockButtonInstance

    map.removeApp()

    expect(map._root).toBeNull()
    expect(map.unmount).toHaveBeenCalled()
    expect(mockButtonInstance.removeAttribute).toHaveBeenCalledWith('style')
    expect(mockButtonInstance.focus).toHaveBeenCalled()
    expect(updateDOMState).toHaveBeenCalledWith(map)
  })

  it('skips unmount if _root is falsy or unmount is not a function', () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    map._root = null
    map.unmount = jest.fn()
    map._openButton = mockButtonInstance

    map.removeApp()

    expect(map.unmount).not.toHaveBeenCalled()
    expect(updateDOMState).toHaveBeenCalled()
  })

  it('skips _openButton actions if _openButton is falsy', () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    map._root = { some: 'root' }
    map.unmount = jest.fn()
    map._openButton = null

    map.removeApp()

    expect(map.unmount).toHaveBeenCalled()
    expect(updateDOMState).toHaveBeenCalled()
  })

  it('does not destroy breakpoint detector on removeApp (persists for history navigation)', () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    map._root = {}
    map.unmount = jest.fn()

    map.removeApp()

    expect(mockBreakpointDetector.destroy).not.toHaveBeenCalled()
    expect(mockInterfaceDetectorCleanup).not.toHaveBeenCalled()
  })

  it('destroys breakpoint detector and unregisters from historyManager on destroy', () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    map._root = {}
    map.unmount = jest.fn()

    map.destroy()

    expect(mockBreakpointDetector.destroy).toHaveBeenCalled()
    expect(mockInterfaceDetectorCleanup).toHaveBeenCalled()
    expect(historyManager.unregister).toHaveBeenCalledWith(map)
  })

  it('calls _hybridBehaviourCleanup on destroy if defined', () => {
    const mockCleanup = jest.fn()
    setupBehavior.mockReturnValue(mockCleanup)

    const map = new InteractiveMap('map', { behaviour: 'hybrid', mapProvider: mapProviderMock })
    map._root = {}
    map.unmount = jest.fn()

    map.destroy()

    expect(mockCleanup).toHaveBeenCalled()
  })

  it('handles null _hybridBehaviourCleanup gracefully', () => {
    setupBehavior.mockReturnValue(null)

    const map = new InteractiveMap('map', { behaviour: 'inline', mapProvider: mapProviderMock })
    map._root = {}
    map.unmount = jest.fn()

    expect(() => map.destroy()).not.toThrow()
  })

  it('_handleExitClick removes app when preserveStateOnClose is false', () => {
    const replaceStateSpy = jest.spyOn(history, 'replaceState').mockImplementation(() => {})

    const map = new InteractiveMap('map', {
      behaviour: 'buttonFirst',
      mapProvider: mapProviderMock,
      mapViewParamKey: 'mv',
      preserveStateOnClose: false
    })

    const removeAppSpy = jest.spyOn(map, 'removeApp').mockImplementation(() => {})
    const hideAppSpy = jest.spyOn(map, 'hideApp').mockImplementation(() => {})

    map._handleExitClick()

    expect(removeAppSpy).toHaveBeenCalled()
    expect(hideAppSpy).not.toHaveBeenCalled()
    expect(replaceStateSpy).toHaveBeenCalledWith(
      history.state,
      '',
      expect.any(String)
    )

    removeAppSpy.mockRestore()
    hideAppSpy.mockRestore()
    replaceStateSpy.mockRestore()
  })

  it('_handleExitClick hides app when preserveStateOnClose is true', () => {
    const replaceStateSpy = jest.spyOn(history, 'replaceState').mockImplementation(() => {})

    const map = new InteractiveMap('map', {
      behaviour: 'buttonFirst',
      mapProvider: mapProviderMock,
      mapViewParamKey: 'mv',
      preserveStateOnClose: true
    })

    const removeAppSpy = jest.spyOn(map, 'removeApp').mockImplementation(() => {})
    const hideAppSpy = jest.spyOn(map, 'hideApp').mockImplementation(() => {})

    map._handleExitClick()

    expect(hideAppSpy).toHaveBeenCalled()
    expect(removeAppSpy).not.toHaveBeenCalled()
    expect(replaceStateSpy).toHaveBeenCalled()

    removeAppSpy.mockRestore()
    hideAppSpy.mockRestore()
    replaceStateSpy.mockRestore()
  })

  it('_handleButtonClick calls showApp when map is hidden', async () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    map._isHidden = true
    const showAppSpy = jest.spyOn(map, 'showApp').mockImplementation(() => {})
    const loadAppSpy = jest.spyOn(map, 'loadApp').mockResolvedValue()
    const pushStateSpy = jest.spyOn(history, 'pushState').mockImplementation(() => {})
    const fakeEvent = { currentTarget: { getAttribute: jest.fn().mockReturnValue('/?mv=map') } }

    await openButtonCallback(fakeEvent)

    expect(showAppSpy).toHaveBeenCalled()
    expect(loadAppSpy).not.toHaveBeenCalled()
    expect(pushStateSpy).toHaveBeenCalled()

    showAppSpy.mockRestore()
    loadAppSpy.mockRestore()
    pushStateSpy.mockRestore()
  })

  it('hideApp sets _isHidden and hides element', () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    map._openButton = mockButtonInstance

    map.hideApp()

    expect(map._isHidden).toBe(true)
    expect(map.rootEl.style.display).toBe('none')
    expect(mockButtonInstance.removeAttribute).toHaveBeenCalledWith('style')
    expect(mockButtonInstance.focus).toHaveBeenCalled()
  })

  it('showApp sets _isHidden false and shows element', () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    map._isHidden = true
    map._openButton = mockButtonInstance
    map.rootEl.style.display = 'none'

    map.showApp()

    expect(map._isHidden).toBe(false)
    expect(map.rootEl.style.display).toBe('')
    expect(mockButtonInstance.style.display).toBe('none')
    expect(updateDOMState).toHaveBeenCalledWith(map)
  })
})

describe('InteractiveMap Public API Methods', () => {
  let map

  beforeEach(() => {
    jest.clearAllMocks()
    document.body.innerHTML = '<div id="map"></div>'
    map = new InteractiveMap('map', { mapProvider: mapProviderMock })
  })

  it('delegates all EventBus and Marker API calls correctly', () => {
    const cb = jest.fn()
    const coords = [10.5, 20.5]
    const options = { color: 'red' }

    map.on('testEvent', cb)
    map.off('testEvent', cb)
    map.emit('customEvent', 123)
    map.addMarker('marker-1', coords, options)
    map.removeMarker('marker-1')
    map.setMode('test-mode')

    expect(map.eventBus.on).toHaveBeenCalledWith('testEvent', cb)
    expect(map.eventBus.off).toHaveBeenCalledWith('testEvent', cb)
    expect(map.eventBus.emit).toHaveBeenCalledWith('customEvent', 123)
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:addmarker', { id: 'marker-1', coords, options })
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:removemarker', 'marker-1')
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:setmode', 'test-mode')
  })

  it('delegates addButton, addPanel, addControl, removePanel, showPanel, hidePanel correctly', () => {
    const buttonConfig = { label: 'MyButton' }
    const panelConfig = { title: 'MyPanel' }
    const controlConfig = { type: 'zoom' }

    // Existing API calls
    map.addButton('btn1', buttonConfig)
    map.addPanel('panel1', panelConfig)
    map.addControl('ctrl1', controlConfig)
    map.removePanel('panel1')

    // New API calls to cover missing lines
    map.showPanel('panel2')
    map.hidePanel('panel3')

    // Existing assertions
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:addbutton', { id: 'btn1', config: buttonConfig })
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:addpanel', { id: 'panel1', config: panelConfig })
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:addcontrol', { id: 'ctrl1', config: controlConfig })
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:removepanel', 'panel1')

    // New assertions for coverage
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:showpanel', 'panel2')
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:hidepanel', 'panel3')
  })
})
