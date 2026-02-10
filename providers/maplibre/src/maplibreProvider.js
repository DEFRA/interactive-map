/**
 * @typedef {import('../../../src/types.js').MapProvider} MapProvider
 * @typedef {import('../../../src/types.js').MapProviderConfig} MapProviderConfig
 */

import { defaults, supportedShortcuts } from './defaults.js'
import { cleanCanvas, applyPreventDefaultFix } from './utils/maplibreFixes.js'
import { attachMapEvents } from './mapEvents.js'
import { attachAppEvents } from './appEvents.js'
import { getAreaDimensions, getCardinalMove, getResolution, getPaddedBounds } from './utils/spatial.js'
import { createMapLabelNavigator } from './utils/labels.js'
import { updateHighlightedFeatures } from './utils/highlightFeatures.js'
import { queryFeatures } from './utils/queryFeatures.js'

/**
 * MapLibre GL JS implementation of the MapProvider interface.
 *
 * @implements {MapProvider}
 */
export default class MapLibreProvider {
  /**
   * @param {Object} options - Constructor options.
   * @param {any} options.mapFramework - The MapLibre GL JS module.
   * @param {MapProviderConfig} [options.mapProviderConfig={}] - Provider configuration.
   * @param {Object} options.events - Event name constants.
   * @param {Object} options.eventBus - Event emitter for publishing map events.
   */
  constructor ({ mapFramework, mapProviderConfig = {}, events, eventBus }) {
    this.maplibreModule = mapFramework
    this.events = events
    this.eventBus = eventBus
    this.capabilities = {
      supportedShortcuts,
      supportsMapSizes: true
    }
    // Spread all config properties onto the instance
    Object.assign(this, mapProviderConfig)
  }

  /**
   * Initialize the map.
   *
   * @param {Object} config - Map initialization configuration.
   * @returns {Promise<void>}
   */
  async initMap (config) {
    const { container, padding, mapStyle, center, zoom, bounds, pixelRatio, ...initConfig } = config
    const { Map: MaplibreMap } = this.maplibreModule
    const { events, eventBus } = this

    const map = new MaplibreMap({
      ...initConfig,
      container,
      style: mapStyle?.url,
      pixelRatio,
      padding,
      center,
      zoom,
      fadeDuration: 0,
      attributionControl: false,
      dragRotate: false,
      doubleClickZoom: false
    })

    // Disable rotation
    map.touchZoomRotate.disableRotation()

    // map.showPadding = true
    this.map = map

    // Set padding before bounds
    this.map.setPadding(padding)

    // Set bounds after padding
    if (bounds) {
      map.fitBounds(bounds, { duration: 0 })
    }


    applyPreventDefaultFix(map)
    cleanCanvas(map)

    attachMapEvents({
      map,
      events,
      eventBus,
      getCenter: this.getCenter.bind(this),
      getZoom: this.getZoom.bind(this),
      getBounds: this.getBounds.bind(this),
      getResolution: this.getResolution.bind(this)
    })

    attachAppEvents({
      map,
      events,
      eventBus
    })

    // Add highlight layer after map load
    map.on('load', () => {
      this.labelNavigator = createMapLabelNavigator(map, mapStyle?.mapColorScheme, events, eventBus)
    })

    this.eventBus.emit(events.MAP_READY, { map })
  }

  /** Destroy the map and clean up resources. */
  destroyMap () {
    this.mapEvents?.remove()
    this.appEvents?.remove()

    this.mapEvents = null
    this.appEvents = null

    this.map.remove()
  }

  // ==========================
  // Side-effects
  // ==========================

  /**
   * Set map view with optional center and zoom.
   *
   * @param {Object} options - View options.
   * @param {[number, number]} [options.center] - Center coordinates [lng, lat].
   * @param {number} [options.zoom] - Zoom level.
   */
  setView ({ center, zoom }) {
    this.map.flyTo({
      center: center || this.getCenter(),
      zoom: zoom || this.getZoom(),
      duration: defaults.animationDuration
    })
  }

  /**
   * Zoom in by delta.
   *
   * @param {number} zoomDelta - Amount to zoom in.
   */
  zoomIn (zoomDelta) {
    this.map.easeTo({
      zoom: this.getZoom() + zoomDelta,
      duration: defaults.animationDuration
    })
  }

  /**
   * Zoom out by delta.
   *
   * @param {number} zoomDelta - Amount to zoom out.
   */
  zoomOut (zoomDelta) {
    this.map.easeTo({
      zoom: this.getZoom() - zoomDelta,
      duration: defaults.animationDuration
    })
  }

  /**
   * Pan map by pixel offset [x, y]. Positive x pans right, positive y pans down.
   *
   * @param {[number, number]} offset - Pixel offset [x, y].
   */
  panBy (offset) {
    this.map.panBy(offset, { duration: defaults.animationDuration })
  }

  /**
   * Fit map view to the specified bounds [west, south, east, north].
   *
   * @param {[number, number, number, number]} bounds - Bounds as [west, south, east, north].
   */
  fitToBounds (bounds) {
    this.map.fitBounds(bounds, { duration: defaults.animationDuration })
  }

  /**
   * Set map padding as pixel insets from the top, bottom, left and right edges of the map.
   *
   * @param {{ top?: number, bottom?: number, left?: number, right?: number }} padding - Padding in pixels.
   */
  setPadding (padding) {
    this.map.setPadding(padding)
  }

  // ==========================
  // Feature highlighting
  // ==========================

  /**
   * @experimental Update highlighted features on the map.
   *
   * @param {any[]} selectedFeatures - Features to highlight.
   * @param {any} stylesMap - Style configuration for highlighting.
   * @returns {any}
   */
  updateHighlightedFeatures (selectedFeatures, stylesMap) {
    const { LngLatBounds } = this.maplibreModule
    return updateHighlightedFeatures({ LngLatBounds, map: this.map, selectedFeatures, stylesMap })
  }

  // ==========================
  // Map label (keyboard-friendly)
  // ==========================

  /**
   * @experimental Highlight the next label in the specified direction for keyboard navigation.
   *
   * @param {string} direction - Direction to navigate (e.g., 'up', 'down', 'left', 'right').
   * @returns {any}
   */
  highlightNextLabel (direction) {
    return this.labelNavigator?.highlightNextLabel(direction) || null
  }

  /**
   * @experimental Highlight the label nearest to the map center.
   *
   * @returns {any}
   */
  highlightLabelAtCenter () {
    return this.labelNavigator?.highlightLabelAtCenter() || null
  }

  /**
   * @experimental Clear any highlighted label.
   */
  clearHighlightedLabel () {
    return this.labelNavigator?.clearHighlightedLabel() || null
  }

  // ==========================
  // Read-only getters
  // ==========================

  /**
   * Get current center coordinates [lng, lat].
   *
   * @returns {[number, number]}
   */
  getCenter () {
    const coord = this.map.getCenter()
    return [Number(coord.lng.toFixed(7)), Number(coord.lat.toFixed(7))]
  }

  /**
   * Get current zoom level.
   *
   * @returns {number}
   */
  getZoom () {
    return Number(this.map.getZoom().toFixed(7))
  }

  /**
   * Get current bounds as [west, south, east, north].
   *
   * @returns {[number, number, number, number]}
   */
  getBounds () {
    return this.map.getBounds().toArray().flat(1)
  }

  /**
   * Query rendered features at a screen pixel position (x from left edge, y from top edge of viewport).
   *
   * @param {{ x: number, y: number }} point - Screen pixel position.
   * @param {Object} [options]
   * @param {number} [options.radius] - Pixel radius to expand the query area. Results sorted closest-first.
   * @returns {any[]}
   */
  getFeaturesAtPoint (point, options) {
    return queryFeatures(this.map, point, options)
  }

  // ==========================
  // Spatial helpers
  // ==========================

  /**
   * Get the dimensions of the visible map area as a formatted string (e.g., '400m by 750m').
   *
   * @returns {string}
   */
  getAreaDimensions () {
    const { LngLatBounds } = this.maplibreModule
    return getAreaDimensions(getPaddedBounds(LngLatBounds, this.map)) // Use padded bounds
  }

  /**
   * Get cardinal direction and distance between two coordinates [lng, lat]. Returns a formatted string (e.g., 'north 400m' or 'south 400m, west 750m').
   *
   * @param {[number, number]} from - Start coordinates [lng, lat].
   * @param {[number, number]} to - End coordinates [lng, lat].
   * @returns {string}
   */
  getCardinalMove (from, to) {
    return getCardinalMove(from, to)
  }

  /**
   * Get map resolution in meters per pixel.
   *
   * @returns {number}
   */
  getResolution () {
    return getResolution(this.map.getCenter(), this.map.getZoom())
  }

  /**
   * Convert map coordinates [lng, lat] to screen pixel position (x from left edge, y from top edge of viewport).
   *
   * @param {[number, number]} coords - Map coordinates [lng, lat].
   * @returns {{ x: number, y: number }} Screen pixel position.
   */
  mapToScreen (coords) {
    return this.map.project(coords)
  }

  /**
   * Convert screen pixel position (x from left edge, y from top edge of viewport) to map coordinates [lng, lat].
   *
   * @param {{ x: number, y: number }} point - Screen pixel position.
   * @returns {[number, number]} Map coordinates [lng, lat].
   */
  screenToMap (point) {
    const { lng, lat } = this.map.unproject([point.x, point.y])
    return [lng, lat]
  }
}
