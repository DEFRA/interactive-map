// src/InteractiveMap/InteractiveMap.js
import '../scss/main.scss'
import historyManager from './historyManager.js'
import { parseDataProperties } from './parseDataProperties.js'
import { checkDeviceSupport } from './deviceChecker.js'
import { createButton } from './buttonManager.js'
import { setupBehavior, shouldLoadComponent } from './behaviourController.js'
import { updateDOMState, removeLoadingState } from './domStateManager.js'
import { renderError } from './renderError.js'
import { mergeConfig } from '../config/mergeConfig.js'
import { createBreakpointDetector } from '../utils/detectBreakpoint.js'
import { createInterfaceDetector, getInterfaceType } from '../utils/detectInterfaceType.js'
import { createReverseGeocode } from '../services/reverseGeocode.js'
import { EVENTS as events } from '../config/events.js'
import { createEventBus } from '../services/eventBus.js'

export default class InteractiveMap {
  _openButton = null
  _root = null // keep react root internally
  _breakpointDetector = null
  _interfaceDetectorCleanup = null
  _hybridBehaviourCleanup = null

  constructor (id, props = {}) {
    this.id = id
    this.rootEl = document.getElementById(id)

    if (!this.rootEl) {
      throw new Error(`Element with id "${id}" not found`)
    }

    // Create app local event bus
    this.eventBus = createEventBus()

    this.config = this._buildConfig(props)

    if (!checkDeviceSupport(this.rootEl, this.config)) {
      return
    }

    if (['buttonFirst', 'hybrid'].includes(this.config.behaviour)) {
      historyManager.register(this)
    }

    this._breakpointDetector = createBreakpointDetector({
      maxMobileWidth: this.config.maxMobileWidth,
      minDesktopWidth: this.config.minDesktopWidth,
      containerEl: this.rootEl
    })
    this._interfaceDetectorCleanup = createInterfaceDetector()

    this._initialize()
  }

  _buildConfig (props) {
    const parsedDataset = parseDataProperties(this.rootEl)
    return mergeConfig({
      id: this.id,
      title: document.title,
      ...parsedDataset,
      ...props
    })
  }

  // Private methods
  _initialize () {
    if (['buttonFirst', 'hybrid'].includes(this.config.behaviour)) {
      this._openButton = createButton(this.config, this.rootEl, (e) => {
        this._handleButtonClick(e)
      })
    }

    this._hybridBehaviourCleanup = setupBehavior(this)

    if (shouldLoadComponent(this.config)) {
      this.loadApp()
    } else {
      removeLoadingState()
    }
  }

  _handleButtonClick (e) {
    this.loadApp()
    history.pushState({ isBack: true }, '', e.currentTarget.getAttribute('href'))
  }

  _handleExitClick () {
    this.removeApp()
    // Remove the map param from the URL using regex to prevent encoding
    const key = this.config.mapViewParamKey
    const href = location.href
    const newUrl = href.replace(new RegExp(`[?&]${key}=[^&]*(&|$)`), (_, p1) => (p1 === '&' ? '?' : '')).replace(/\?$/, '')
    history.replaceState(history.state, '', newUrl)
  }

  // Public methods
  async loadApp () {
    if (this._openButton) {
      this._openButton.style.display = 'none'
    }

    try {
      const { initialiseApp } = await import(/* webpackChunkName: "im-core" */ '../App/initialiseApp.js')
      const { MapProvider, mapFramework, mapProviderConfig } = await this.config.mapProvider.load()

      // Initialise reverseGeocode service if provided, using crs from mapProvider
      if (this.config.reverseGeocodeProvider) {
        createReverseGeocode(
          this.config.reverseGeocodeProvider,
          mapProviderConfig.crs
        )
      }

      // Initialise App
      const appInstance = await initialiseApp(this.rootEl, {
        id: this.id,
        initialBreakpoint: this._breakpointDetector.getBreakpoint(),
        initialInterfaceType: getInterfaceType(),
        ...this.config,
        MapProvider,
        mapProviderConfig,
        mapFramework,
        eventBus: this.eventBus,
        breakpointDetector: this._breakpointDetector,
        handleExitClick: this._handleExitClick.bind(this)
      })

      // Merge returned APIs (plugins etc.)
      this._root = appInstance._root
      delete appInstance._root

      // Only assign properties but don't eventBus methods
      const protectedKeys = ['on', 'off', 'emit']

      Object.keys(appInstance).forEach(key => {
        if (!protectedKeys.includes(key)) {
          this[key] = appInstance[key]
        }
      })

      updateDOMState(this)
    } catch (err) {
      renderError(this.rootEl, this.config.genericErrorText)
      console.error(err)
      throw err
    }
  }

  removeApp () {
    if (this._root && typeof this.unmount === 'function') {
      this.unmount()
      this._root = null
    }

    if (this._openButton) {
      this._openButton.removeAttribute('style')
      this._openButton.focus()
    }

    updateDOMState(this)

    this.eventBus.emit(events.MAP_DESTROY, { mapId: this.id })
  }

  destroy () {
    this.removeApp()
    this._breakpointDetector?.destroy()
    this._interfaceDetectorCleanup?.()
    this._hybridBehaviourCleanup?.()
    historyManager.unregister(this)
    this.eventBus.destroy()
  }

  // API - EventBus methods
  on (...args) {
    this.eventBus.on(...args)
  }

  off (...args) {
    this.eventBus.off(...args)
  }

  emit (...args) {
    this.eventBus.emit(...args)
  }

  // API - location markers
  addMarker (id, coords, options) {
    this.eventBus.emit(events.APP_ADD_MARKER, { id, coords, options })
  }

  removeMarker (id) {
    this.eventBus.emit(events.APP_REMOVE_MARKER, id)
  }

  // API - change app mode
  setMode (mode) {
    this.eventBus.emit(events.APP_SET_MODE, mode)
  }

  // Interface API add button/panel/control, remove panel
  addButton (id, config) {
    this.eventBus.emit(events.APP_ADD_BUTTON, { id, config })
  }

  addPanel (id, config) {
    this.eventBus.emit(events.APP_ADD_PANEL, { id, config })
  }

  removePanel (id) {
    this.eventBus.emit(events.APP_REMOVE_PANEL, id)
  }

  showPanel (id) {
    this.eventBus.emit(events.APP_SHOW_PANEL, id)
  }

  hidePanel (id) {
    this.eventBus.emit(events.APP_HIDE_PANEL, id)
  }

  addControl (id, config) {
    this.eventBus.emit(events.APP_ADD_CONTROL, { id, config })
  }
}
