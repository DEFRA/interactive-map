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
  createEventBus: jest.fn(() => ({ on: jest.fn(), off: jest.fn(), emit: jest.fn(), emitWhenReady: jest.fn(), destroy: jest.fn() })),
  default: { on: jest.fn(), off: jest.fn(), emit: jest.fn(), emitWhenReady: jest.fn(), destroy: jest.fn() }
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
const MAP_ROOT_HTML = '<div id="map"></div>'

// --- Shared setup ---

let rootEl, openButtonCallback

function setupBeforeEach () {
  jest.clearAllMocks()
  checkDeviceSupport.mockReturnValue(true)
  document.body.innerHTML = MAP_ROOT_HTML
  rootEl = document.getElementById('map')
  initialiseApp.mockResolvedValue({ _root: {}, someApi: jest.fn(), unmount: jest.fn() })
  createButtonMock.mockImplementation((_config, _root, cb) => {
    openButtonCallback = cb
    return mockButtonInstance
  })
}

// --- Construction ---

describe('InteractiveMap — Construction', () => {
  beforeEach(setupBeforeEach)
  afterEach(() => jest.restoreAllMocks())

  it('throws if root element not found', () => {
    expect(() => new InteractiveMap('nonexistent')).toThrow(/not found/)
  })

  it('returns early if device not supported', () => {
    checkDeviceSupport.mockReturnValue(false)
    expect(() => new InteractiveMap('map', { mapProvider: mapProviderMock })).not.toThrow()
    expect(historyManager.register).not.toHaveBeenCalled()
    expect(createBreakpointDetector).not.toHaveBeenCalled()
    expect(createInterfaceDetector).not.toHaveBeenCalled()
  })

  it('registers with historyManager for buttonFirst behaviour', () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    expect(historyManager.register).toHaveBeenCalledWith(map)
  })

  it('creates breakpoint and interface detectors', () => {
    const map = new InteractiveMap('map', { mapProvider: mapProviderMock })
    expect(createBreakpointDetector).toHaveBeenCalledWith(expect.objectContaining({ containerEl: map.rootEl }))
    expect(createInterfaceDetector).toHaveBeenCalled()
  })

  it('merges dataset props and constructor props into config', () => {
    parseDataProperties.mockReturnValue({ test: 123 })
    const map = new InteractiveMap('map', { custom: 'value', mapProvider: mapProviderMock })
    expect(map.config.test).toBe(123)
    expect(map.config.custom).toBe('value')
  })

  it('creates open button, sets up behavior, and exposes eventBus methods', () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    expect(createButtonMock).toHaveBeenCalled()
    expect(setupBehavior).toHaveBeenCalledWith(map)
    expect(typeof map.on).toBe('function')
    expect(typeof map.off).toBe('function')
    expect(typeof map.emit).toBe('function')
  })
})

// --- loadApp ---

describe('InteractiveMap — loadApp', () => {
  beforeEach(setupBeforeEach)
  afterEach(() => jest.restoreAllMocks())

  it('returns early without loading when _root is set or _isLoading is true', async () => {
    shouldLoadComponent.mockReturnValue(false)
    const map = new InteractiveMap('map', { mapProvider: mapProviderMock })

    map._root = {}
    await map.loadApp()
    expect(initialiseApp).not.toHaveBeenCalled()

    map._root = null
    map._isLoading = true
    await map.loadApp()
    expect(initialiseApp).not.toHaveBeenCalled()
  })

  it('calls loadApp if shouldLoadComponent returns true', async () => {
    shouldLoadComponent.mockReturnValue(true)
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(initialiseApp).toHaveBeenCalled()
    expect(map).toBeDefined()
  })

  it('calls removeLoadingState if shouldLoadComponent returns false', () => {
    shouldLoadComponent.mockReturnValue(false)
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    expect(removeLoadingState).toHaveBeenCalled()
    expect(map).toBeDefined()
  })

  it('initializes reverseGeocode if reverseGeocodeProvider is provided', async () => {
    shouldLoadComponent.mockReturnValue(false)
    const mapProviderWithCRS = {
      load: jest.fn().mockResolvedValue({ MapProvider: {}, mapFramework: {}, mapProviderConfig: { crs: 'EPSG:27700' } })
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

  it('renders error and re-throws on provider failure', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const failingProvider = { load: jest.fn().mockRejectedValue(new Error('fail')) }
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: failingProvider, genericErrorText: 'error' })
    await expect(map.loadApp()).rejects.toThrow('fail')
    expect(renderError).toHaveBeenCalledWith(rootEl, 'error')
  })

  it('does not overwrite eventBus methods; emits APP_OPENED', async () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    const originalOn = map.on
    initialiseApp.mockResolvedValue({ _root: {}, on: jest.fn(), off: jest.fn(), emit: jest.fn(), someMethod: jest.fn() })
    await map.loadApp()
    expect(map.on).toBe(originalOn)
    expect(typeof map.someMethod).toBe('function')
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:opened', { statePreserved: false })
  })
})

// --- _handleButtonClick ---

describe('InteractiveMap — _handleButtonClick', () => {
  beforeEach(setupBeforeEach)
  afterEach(() => jest.restoreAllMocks())

  it('pushState and loadApp on first open', async () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', manageHistoryState: true, mapProvider: mapProviderMock })
    jest.spyOn(map, 'loadApp').mockResolvedValue()
    jest.spyOn(history, 'pushState').mockImplementation(() => {})
    await openButtonCallback({ currentTarget: { getAttribute: jest.fn().mockReturnValue('/?mv=map') } })
    expect(map.loadApp).toHaveBeenCalled()
    expect(history.pushState).toHaveBeenCalledWith({ isBack: true }, '', '/?mv=map')
  })

  it('calls showApp (not loadApp) when map is hidden', async () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', manageHistoryState: true, mapProvider: mapProviderMock })
    map._isHidden = true
    jest.spyOn(map, 'showApp').mockImplementation(() => {})
    jest.spyOn(map, 'loadApp').mockResolvedValue()
    jest.spyOn(history, 'pushState').mockImplementation(() => {})
    await openButtonCallback({ currentTarget: { getAttribute: jest.fn().mockReturnValue('/?mv=map') } })
    expect(map.showApp).toHaveBeenCalled()
    expect(map.loadApp).not.toHaveBeenCalled()
    expect(history.pushState).toHaveBeenCalled()
  })

  it('skips pushState when manageHistoryState is false', async () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', manageHistoryState: false, mapProvider: mapProviderMock })
    expect(map.config.manageHistoryState).toBe(false)
    jest.spyOn(history, 'pushState').mockImplementation(() => {})
    await openButtonCallback({ currentTarget: { getAttribute: jest.fn().mockReturnValue('/?mv=map') } })
    expect(history.pushState).not.toHaveBeenCalled()
  })

  it('shows hidden app without pushState when manageHistoryState is false', async () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', manageHistoryState: false, mapProvider: mapProviderMock })
    map._isHidden = true
    jest.spyOn(map, 'showApp').mockImplementation(() => {})
    jest.spyOn(map, 'loadApp').mockResolvedValue()
    jest.spyOn(history, 'pushState').mockImplementation(() => {})
    await openButtonCallback({ currentTarget: { getAttribute: jest.fn().mockReturnValue('/?mv=map') } })
    expect(map.showApp).toHaveBeenCalled()
    expect(map.loadApp).not.toHaveBeenCalled()
    expect(history.pushState).not.toHaveBeenCalled()
  })

  it('is a no-op when app is already open (_root is set)', async () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', manageHistoryState: true, mapProvider: mapProviderMock })
    map._root = {}
    jest.spyOn(map, 'showApp').mockImplementation(() => {})
    jest.spyOn(map, 'loadApp').mockResolvedValue()
    jest.spyOn(history, 'pushState').mockImplementation(() => {})
    await openButtonCallback({ currentTarget: { getAttribute: jest.fn().mockReturnValue('/?mv=map') } })
    expect(map.showApp).not.toHaveBeenCalled()
    expect(map.loadApp).not.toHaveBeenCalled()
    expect(history.pushState).not.toHaveBeenCalled()
  })
})

// --- removeApp + destroy ---

describe('InteractiveMap — removeApp and destroy', () => {
  beforeEach(setupBeforeEach)
  afterEach(() => jest.restoreAllMocks())

  it('removeApp: unmounts, resets button, updates DOM, emits APP_CLOSED', () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    map._root = {}
    map.unmount = jest.fn()
    map._openButton = mockButtonInstance
    map.removeApp()
    expect(map._root).toBeNull()
    expect(map.unmount).toHaveBeenCalled()
    expect(mockButtonInstance.removeAttribute).toHaveBeenCalledWith('style')
    expect(mockButtonInstance.focus).toHaveBeenCalled()
    expect(updateDOMState).toHaveBeenCalledWith(map, { isFullscreen: false })
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:closed', { statePreserved: false })
  })

  it('removeApp: skips unmount when _root is null; skips button when _openButton is null', () => {
    const map = new InteractiveMap('map', { mapProvider: mapProviderMock })
    map.unmount = jest.fn()
    map._openButton = null
    map.removeApp()
    expect(map.unmount).not.toHaveBeenCalled()
    expect(updateDOMState).toHaveBeenCalled()
  })

  it('removeApp: does not destroy detectors (they persist for history navigation)', () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    map._root = {}
    map.unmount = jest.fn()
    map.removeApp()
    expect(mockBreakpointDetector.destroy).not.toHaveBeenCalled()
    expect(mockInterfaceDetectorCleanup).not.toHaveBeenCalled()
  })

  it('destroy: cleans up detectors, unregisters, calls hybrid cleanup', () => {
    const mockCleanup = jest.fn()
    setupBehavior.mockReturnValue(mockCleanup)
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    map._root = {}
    map.unmount = jest.fn()
    map.destroy()
    expect(mockBreakpointDetector.destroy).toHaveBeenCalled()
    expect(mockInterfaceDetectorCleanup).toHaveBeenCalled()
    expect(historyManager.unregister).toHaveBeenCalledWith(map)
    expect(mockCleanup).toHaveBeenCalled()
  })

  it('destroy: handles null _hybridBehaviourCleanup gracefully', () => {
    setupBehavior.mockReturnValue(null)
    expect(() => new InteractiveMap('map', { mapProvider: mapProviderMock }).destroy()).not.toThrow()
  })
})

// --- _handleExitClick ---

describe('InteractiveMap — _handleExitClick', () => {
  beforeEach(setupBeforeEach)
  afterEach(() => jest.restoreAllMocks())

  it.each([
    [false, 'removeApp', 'hideApp'],
    [true, 'hideApp', 'removeApp']
  ])('preserveStateOnClose=%s: calls %s and replaces URL', (preserve, called, notCalled) => {
    jest.spyOn(history, 'replaceState').mockImplementation(() => {})
    const map = new InteractiveMap('map', {
      behaviour: 'buttonFirst',
      mapProvider: mapProviderMock,
      mapViewQueryParam: 'mv',
      manageHistoryState: true,
      preserveStateOnClose: preserve
    })
    jest.spyOn(map, 'removeApp').mockImplementation(() => {})
    jest.spyOn(map, 'hideApp').mockImplementation(() => {})
    map._handleExitClick()
    expect(map[called]).toHaveBeenCalled()
    expect(map[notCalled]).not.toHaveBeenCalled()
    expect(history.replaceState).toHaveBeenCalled()
  })

  it('calls history.back() when history.state.isBack is true', () => {
    jest.spyOn(history, 'back').mockImplementation(() => {})
    Object.defineProperty(history, 'state', { value: { isBack: true }, writable: true, configurable: true })
    const map = new InteractiveMap('map', {
      behaviour: 'buttonFirst',
      mapProvider: mapProviderMock,
      mapViewQueryParam: 'mv',
      manageHistoryState: true
    })
    map._handleExitClick()
    expect(history.back).toHaveBeenCalled()
    Object.defineProperty(history, 'state', { value: null, writable: true, configurable: true })
  })

  it('skips all history when manageHistoryState is false', () => {
    jest.spyOn(history, 'back').mockImplementation(() => {})
    jest.spyOn(history, 'replaceState').mockImplementation(() => {})
    const map = new InteractiveMap('map', {
      behaviour: 'buttonFirst', mapProvider: mapProviderMock, manageHistoryState: false
    })
    map._handleExitClick()
    expect(history.back).not.toHaveBeenCalled()
    expect(history.replaceState).not.toHaveBeenCalled()
  })

  it('calls hideApp (not removeApp) when manageHistoryState is false and preserveStateOnClose is true', () => {
    const map = new InteractiveMap('map', {
      behaviour: 'buttonFirst',
      mapProvider: mapProviderMock,
      manageHistoryState: false,
      preserveStateOnClose: true
    })
    jest.spyOn(map, 'hideApp').mockImplementation(() => {})
    jest.spyOn(map, 'removeApp').mockImplementation(() => {})
    map._handleExitClick()
    expect(map.hideApp).toHaveBeenCalled()
    expect(map.removeApp).not.toHaveBeenCalled()
  })

  it('returns early without calling history.back() when _isClosingViaBack is already true', () => {
    jest.spyOn(history, 'back').mockImplementation(() => {})
    Object.defineProperty(history, 'state', { value: { isBack: true }, writable: true, configurable: true })
    const map = new InteractiveMap('map', {
      behaviour: 'buttonFirst',
      mapProvider: mapProviderMock,
      mapViewQueryParam: 'mv',
      manageHistoryState: true
    })
    map._isClosingViaBack = true
    map._handleExitClick()
    expect(history.back).not.toHaveBeenCalled()
    Object.defineProperty(history, 'state', { value: null, writable: true, configurable: true })
  })

  it('resets _isClosingViaBack after 1000ms safety-net timeout', () => {
    jest.useFakeTimers()
    jest.spyOn(history, 'back').mockImplementation(() => {})
    Object.defineProperty(history, 'state', { value: { isBack: true }, writable: true, configurable: true })
    const map = new InteractiveMap('map', {
      behaviour: 'buttonFirst', mapProvider: mapProviderMock, manageHistoryState: true
    })
    map._handleExitClick()
    expect(map._isClosingViaBack).toBe(true)
    jest.advanceTimersByTime(1000)
    expect(map._isClosingViaBack).toBe(false)
    jest.useRealTimers()
    Object.defineProperty(history, 'state', { value: null, writable: true, configurable: true })
  })
})

// --- hideApp / showApp ---

describe('InteractiveMap — hideApp and showApp', () => {
  beforeEach(setupBeforeEach)
  afterEach(() => jest.restoreAllMocks())

  it('hideApp: hides element, focuses button, restores title, emits APP_CLOSED', () => {
    document.title = 'Map View: Original Page Title'
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    map._openButton = mockButtonInstance
    map.hideApp()
    expect(map._isHidden).toBe(true)
    expect(map.rootEl.style.display).toBe('none')
    expect(mockButtonInstance.removeAttribute).toHaveBeenCalledWith('style')
    expect(mockButtonInstance.focus).toHaveBeenCalled()
    expect(document.title).toBe('Original Page Title')
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:closed', { statePreserved: true })
  })

  it('hideApp: works without _openButton', () => {
    const map = new InteractiveMap('map', { mapProvider: mapProviderMock })
    map._openButton = null
    expect(() => map.hideApp()).not.toThrow()
    expect(map._isHidden).toBe(true)
  })

  it('showApp: shows element, clears _isHidden, hides button, updates DOM, emits APP_OPENED', () => {
    const map = new InteractiveMap('map', { behaviour: 'buttonFirst', mapProvider: mapProviderMock })
    map._isHidden = true
    map._openButton = mockButtonInstance
    map.rootEl.style.display = 'none'
    map.showApp()
    expect(map._isHidden).toBe(false)
    expect(map.rootEl.style.display).toBe('')
    expect(mockButtonInstance.style.display).toBe('none')
    expect(updateDOMState).toHaveBeenCalledWith(map)
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:opened', { statePreserved: true })
  })

  it('showApp: works without _openButton', () => {
    const map = new InteractiveMap('map', { mapProvider: mapProviderMock })
    map._openButton = null
    expect(() => map.showApp()).not.toThrow()
    expect(map._isHidden).toBe(false)
  })
})

// --- open / close ---

describe('InteractiveMap — open and close', () => {
  beforeEach(setupBeforeEach)
  afterEach(() => jest.restoreAllMocks())

  it('open(): shows hidden map, loads if uninitialised, no-op if already open', () => {
    const map = new InteractiveMap('map', { mapProvider: mapProviderMock })
    jest.spyOn(map, 'showApp').mockImplementation(() => {})
    jest.spyOn(map, 'loadApp').mockResolvedValue()

    map._isHidden = true
    map.open()
    expect(map.showApp).toHaveBeenCalledTimes(1)
    expect(map.loadApp).not.toHaveBeenCalled()

    map._isHidden = false
    map._root = {}
    map.open()
    expect(map.showApp).toHaveBeenCalledTimes(1)
    expect(map.loadApp).not.toHaveBeenCalled()

    map._root = null
    map.open()
    expect(map.loadApp).toHaveBeenCalledTimes(1)
  })

  it('close(): delegates to _handleExitClick', () => {
    const map = new InteractiveMap('map', { mapProvider: mapProviderMock })
    jest.spyOn(map, '_handleExitClick').mockImplementation(() => {})
    map.close()
    expect(map._handleExitClick).toHaveBeenCalled()
  })
})

// --- _removeMapParamFromUrl ---

describe('_removeMapParamFromUrl', () => {
  const PARAM = 'mv'
  const BASE = 'https://example.com/page'
  let map

  beforeEach(() => {
    document.body.innerHTML = MAP_ROOT_HTML
    map = new InteractiveMap('map', { mapProvider: { load: jest.fn() }, mapViewParamKey: PARAM })
  })

  it('removes param when followed by another param', () => {
    expect(map._removeMapParamFromUrl(`${BASE}?${PARAM}=map&foo=1`, PARAM)).toBe(`${BASE}?foo=1`)
  })

  it('removes param when it is the last param', () => {
    expect(map._removeMapParamFromUrl(`${BASE}?foo=1&${PARAM}=map`, PARAM)).toBe(`${BASE}?foo=1`)
  })

  it('removes lone param and trailing ?', () => {
    expect(map._removeMapParamFromUrl(`${BASE}?${PARAM}=map`, PARAM)).toBe(BASE)
  })

  it('returns href unchanged when param does not exist', () => {
    const href = `${BASE}?foo=1`
    expect(map._removeMapParamFromUrl(href, PARAM)).toBe(href)
  })
})

// --- Public API ---

describe('InteractiveMap — Public API Methods', () => {
  let map

  beforeEach(() => {
    jest.clearAllMocks()
    document.body.innerHTML = MAP_ROOT_HTML
    map = new InteractiveMap('map', { mapProvider: mapProviderMock })
  })

  it('delegates EventBus and Marker API calls', () => {
    const cb = jest.fn()
    const coords = [10.5, 20.5]
    const options = { color: 'red' }
    map.on('testEvent', cb)
    map.off('testEvent', cb)
    map.emit('customEvent', 123)
    map.addMarker('marker-1', coords, options)
    map.updateMarker('marker-1', options)
    map.removeMarker('marker-1')
    map.setMode('test-mode')
    expect(map.eventBus.on).toHaveBeenCalledWith('testEvent', cb)
    expect(map.eventBus.off).toHaveBeenCalledWith('testEvent', cb)
    expect(map.eventBus.emit).toHaveBeenCalledWith('customEvent', 123)
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:addmarker', { id: 'marker-1', coords, options })
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:updatemarker', { id: 'marker-1', options })
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:removemarker', 'marker-1')
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:setmode', 'test-mode')
  })

  it('delegates Panel, Button, and Control API calls', () => {
    const buttonConfig = { label: 'MyButton' }
    const panelConfig = { title: 'MyPanel' }
    const controlConfig = { type: 'zoom' }
    map.addButton('btn1', buttonConfig)
    map.addPanel('panel1', panelConfig)
    map.addControl('ctrl1', controlConfig)
    map.removePanel('panel1')
    map.showPanel('panel2')
    map.hidePanel('panel3')
    map.toggleButtonState('btn-1', 'disabled', true)
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:addbutton', { id: 'btn1', config: buttonConfig })
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:addpanel', { id: 'panel1', config: panelConfig })
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:addcontrol', { id: 'ctrl1', config: controlConfig })
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:removepanel', 'panel1')
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:showpanel', { id: 'panel2', focus: true })
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:hidepanel', 'panel3')
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:togglebuttonstate', { id: 'btn-1', prop: 'disabled', value: true })
  })

  it('setContinueEnabled enables and disables the journey continue button', () => {
    map.setContinueEnabled(true)
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:togglebuttonstate', { id: 'journeyContinue', prop: 'disabled', value: false })

    map.setContinueEnabled(false)
    expect(map.eventBus.emit).toHaveBeenCalledWith('app:togglebuttonstate', { id: 'journeyContinue', prop: 'disabled', value: true })
  })

  it('fitToBounds and setView emit correct events', () => {
    const bbox = [-0.489, 51.28, 0.236, 51.686]
    const center = [-0.1276, 51.5074]
    map.fitToBounds(bbox)
    map.setView({ center, zoom: 12 })
    expect(map.eventBus.emitWhenReady).toHaveBeenCalledWith('map:fittobounds', bbox)
    expect(map.eventBus.emitWhenReady).toHaveBeenCalledWith('map:setview', { center, zoom: 12 })
  })
})
