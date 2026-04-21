// src/InteractiveMap/InteractiveMap.js

/**
 * @typedef {import('../types.js').ButtonDefinition} ButtonDefinition
 * @typedef {import('../types.js').ControlDefinition} ControlDefinition
 * @typedef {import('../types.js').InteractiveMapConfig} InteractiveMapConfig
 * @typedef {import('../types.js').MarkerOptions} MarkerOptions
 * @typedef {import('../types.js').PanelDefinition} PanelDefinition
 */

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
import { toggleInertElements } from '../utils/toggleInertElements.js'

// Polyfills to ensure entry point works on all devices
import './polyfills.js'

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
    if (this.config.manageHistoryState) {
      history.pushState({ isBack: true }, '', e.currentTarget.getAttribute('href'))
    }
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

    if (!this.config.manageHistoryState) {
      return
    }

    // If this history entry was pushed by the map's open button, go back so the
    // ?mv= entry is preserved as a forward entry (browser forward re-opens the map).
    // Otherwise (direct URL / bookmark), just strip the param in place.
    if (history.state?.isBack) {
      history.back()
    } else {
      const key = this.config.mapViewParamKey
      const newUrl = this._removeMapParamFromUrl(location.href, key)
      history.replaceState(history.state, '', newUrl)
    }
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
      this.eventBus.emit(events.APP_OPENED, { statePreserved: false })
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

    updateDOMState(this, { isFullscreen: false })

    this.eventBus.emit(events.APP_CLOSED, { statePreserved: false })
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
      document.title = parts.at(-1)
    }

    this.eventBus.emit(events.APP_CLOSED, { statePreserved: true })
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

    this.eventBus.emit(events.APP_OPENED, { statePreserved: true })
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
   * Update an existing marker's options without replacing it. No-op if the marker id is not found.
   * Merges the provided options into the existing marker — unspecified properties are preserved.
   * Pass `coords` inside options to move the marker to new coordinates.
   *
   * @param {string} id - Marker identifier to update.
   * @param {MarkerOptions & { coords?: [number, number] }} [options] - Properties to merge into the marker.
   */
  updateMarker (id, options) {
    this.eventBus.emit(events.APP_UPDATE_MARKER, { id, options })
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
   * Focus is moved to the panel on open by default. Set `focus: false` in the
   * config to suppress this — useful when adding panels on page load where
   * stealing focus would be disruptive.
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
   * Focus is moved to the panel by default. Set `focus: false` in options to
   * suppress this — useful when showing a panel and you want focus to remain on the button.
   *
   * @param {string} id - Panel identifier to show.
   * @param {object} [options]
   * @param {boolean} [options.focus=true] - Whether to move focus to the panel.
   */
  showPanel (id, { focus = true } = {}) {
    this.eventBus.emit(events.APP_SHOW_PANEL, { id, focus })
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

  /**
   * Fit the map view to a bounding box or GeoJSON geometry, respecting the safe zone padding.
   *
   * @param {[number, number, number, number] | object} target - Bounds as [west, south, east, north] or [minX, minY, maxX, maxY] depending on the crs, or a GeoJSON Feature, FeatureCollection, or geometry.
   */
  fitToBounds (target) {
    this.eventBus.emitWhenReady(events.MAP_FIT_TO_BOUNDS, target)
  }

  /**
   * Set the map center and zoom, respecting the safe zone padding.
   *
   * @param {{ center?: [number, number], zoom?: number }} opts - View options.
   */
  setView (opts) {
    this.eventBus.emitWhenReady(events.MAP_SET_VIEW, opts)
  }

  /**
   * Programmatically open the map.
   *
   * Equivalent to the user clicking the open button. If the map has been hidden (e.g. in hybrid mode),
   * it will be shown; otherwise the app will be loaded for the first time.
   */
  open () {
    if (this._isHidden) {
      this.showApp()
    } else if (this._root) {
      // App is already open — no-op
    } else {
      this.loadApp()
    }
  }

  /**
   * Programmatically close the map.
   *
   * Triggers the same logic as the exit button. If `preserveStateOnClose` is true, the map is hidden
   * but not destroyed; otherwise the app is removed entirely.
   */
  close () {
    this._handleExitClick()
  }
}
