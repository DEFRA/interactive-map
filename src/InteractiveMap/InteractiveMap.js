// src/InteractiveMap/InteractiveMap.js

/**
 * @typedef {import('../types.js').ButtonDefinition} ButtonDefinition
 * @typedef {import('../types.js').ControlDefinition} ControlDefinition
 * @typedef {import('../types.js').InteractiveMapConfig} InteractiveMapConfig
 * @typedef {import('../types.js').MarkerOptions} MarkerOptions
 * @typedef {import('../types.js').PanelDefinition} PanelDefinition
 */

import '../scss/main.scss'
// Polyfills to ensure entry point works on all devices
import './polyfills.js'
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
import { toggleInertElements } from '../utils/toggleInertElements.js'

/**
 * Main entry point for the Interactive Map component.
 * Handles initialization, lifecycle, and public API methods.
 */
export default class InteractiveMap {
  _openButton = null
  _root = null // keep react root internally
  _breakpointDetector = null
  _interfaceDetectorCleanup = null
  _hybridBehaviourCleanup = null
  _isHidden = false // tracks if map is hidden but preserved (hybrid mode)

  /**
   * Create a new InteractiveMap instance.
   *
   * @param {string} id - The DOM element ID to mount the map into.
   * @param {Partial<InteractiveMapConfig>} [props={}] - Configuration options.
   */
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
    history.pushState({ isBack: true }, '', e.currentTarget.getAttribute('href'))
    if (this._isHidden) {
      this.showApp()
    } else {
      this.loadApp()
    }
  }

  _removeMapParamFromUrl (href, key) {
    const regex = new RegExp(`[?&]${key}=[^&]*(&|$)`)

    if (!regex.test(href)) {
      return href
    }

    return href
      .replace(regex, (_, p1) => {
        return p1 === '&' ? '?' : ''
      })
      .replace(/\?$/, '')
  }

  _handleExitClick () {
    if (this.config.preserveStateOnClose) {
      this.hideApp()
    } else {
      this.removeApp()
    }

    const key = this.config.mapViewParamKey
    const href = location.href
    const newUrl = this._removeMapParamFromUrl(href, key)

    history.replaceState(history.state, '', newUrl)
  }

  /**
   * Load and initialize the map application.
   *
   * @internal Not intended for end-user use.
   * @returns {Promise<void>}
   */
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
      const protectedKeys = new Set(['on', 'off', 'emit'])

      Object.keys(appInstance).forEach(key => {
        if (!protectedKeys.has(key)) {
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

  /**
   * Remove the map application and restore the initial state.
   *
   * @internal Not intended for end-user use.
   */
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

  /**
   * Hide the map application without destroying it (preserves state).
   * Used in hybrid mode when resizing below breakpoint.
   *
   * @internal Not intended for end-user use.
   */
  hideApp () {
    this._isHidden = true
    this.rootEl.style.display = 'none'

    // Restore inert elements before focusing button
    toggleInertElements({ containerEl: this.rootEl, isFullscreen: false })

    if (this._openButton) {
      this._openButton.removeAttribute('style')
      this._openButton.focus()
    }

    // Remove fullscreen classes
    document.documentElement.classList.remove('im-is-fullscreen')
    this.rootEl.classList.remove('im-is-fullscreen')

    // Reset page title (remove prepended map title)
    const parts = document.title.split(': ')
    if (parts.length > 1) {
      document.title = parts[parts.length - 1]
    }
  }

  /**
   * Show a previously hidden map application.
   * Used in hybrid mode when resizing above breakpoint or clicking button.
   *
   * @internal Not intended for end-user use.
   */
  showApp () {
    this._isHidden = false
    this.rootEl.style.display = ''

    if (this._openButton) {
      this._openButton.style.display = 'none'
    }

    updateDOMState(this)
  }

  /**
   * Destroy the map instance and clean up all resources.
   *
   * @internal Not intended for end-user use.
   */
  destroy () {
    this.removeApp()
    this._breakpointDetector?.destroy()
    this._interfaceDetectorCleanup?.()
    this._hybridBehaviourCleanup?.()
    historyManager.unregister(this)
    this.eventBus.destroy()
  }

  /**
   * Subscribe to an event.
   *
   * @param {string} event - Event name.
   * @param {Function} callback - Event handler.
   */
  on (...args) {
    this.eventBus.on(...args)
  }

  /**
   * Unsubscribe from an event.
   *
   * @param {string} event - Event name.
   * @param {Function} callback - Event handler to remove.
   */
  off (...args) {
    this.eventBus.off(...args)
  }

  /**
   * Emit an event.
   *
   * @param {string} event - Event name.
   * @param {any} [data] - Event data.
   */
  emit (...args) {
    this.eventBus.emit(...args)
  }

  /**
   * Add a marker to the map.
   *
   * @param {string} id - Unique marker identifier.
   * @param {[number, number]} coords - Coordinates [lng, lat] or [easting, northing] depending on crs.
   * @param {MarkerOptions} [options] - Optional marker appearance options.
   */
  addMarker (id, coords, options) {
    this.eventBus.emit(events.APP_ADD_MARKER, { id, coords, options })
  }

  /**
   * Remove a marker from the map.
   *
   * @param {string} id - Marker identifier to remove.
   */
  removeMarker (id) {
    this.eventBus.emit(events.APP_REMOVE_MARKER, id)
  }

  /**
   * Set the application mode.
   *
   * @param {string} mode - Mode identifier.
   */
  setMode (mode) {
    this.eventBus.emit(events.APP_SET_MODE, mode)
  }

  /**
   * Add a button to the UI.
   *
   * @param {string} id - Unique button identifier.
   * @param {ButtonDefinition} config - Button configuration.
   */
  addButton (id, config) {
    this.eventBus.emit(events.APP_ADD_BUTTON, { id, config })
  }

  /**
   * Set or toggle a button state.
   *
   * @param {string} id - Button identifier.
   * @param {'hidden'|'pressed'|'disabled'} prop - The button state to change.
   * @param {boolean} [value] - Optional boolean. If provided, sets state explicitly; otherwise toggles.
   */
  toggleButtonState (id, prop, value) {
    this.eventBus.emit(events.APP_TOGGLE_BUTTON_STATE, { id, prop, value })
  }

  /**
   * Add a panel to the UI.
   *
   * @param {string} id - Unique panel identifier.
   * @param {PanelDefinition} config - Panel configuration.
   */
  addPanel (id, config) {
    this.eventBus.emit(events.APP_ADD_PANEL, { id, config })
  }

  /**
   * Remove a panel from the UI.
   *
   * @param {string} id - Panel identifier to remove.
   */
  removePanel (id) {
    this.eventBus.emit(events.APP_REMOVE_PANEL, id)
  }

  /**
   * Show a panel.
   *
   * @param {string} id - Panel identifier to show.
   */
  showPanel (id) {
    this.eventBus.emit(events.APP_SHOW_PANEL, id)
  }

  /**
   * Hide a panel.
   *
   * @param {string} id - Panel identifier to hide.
   */
  hidePanel (id) {
    this.eventBus.emit(events.APP_HIDE_PANEL, id)
  }

  /**
   * Add a custom control to the UI.
   *
   * @param {string} id - Unique control identifier.
   * @param {ControlDefinition} config - Control configuration.
   */
  addControl (id, config) {
    this.eventBus.emit(events.APP_ADD_CONTROL, { id, config })
  }
}
