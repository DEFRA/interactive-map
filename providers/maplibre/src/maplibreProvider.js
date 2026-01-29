import { defaults, supportedShortcuts } from './defaults.js'
import { cleanCanvas, applyPreventDefaultFix } from './utils/maplibreFixes.js'
import { attachMapEvents } from './mapEvents.js'
import { attachAppEvents } from './appEvents.js'
import { getAreaDimensions, getCardinalMove, getResolution, getPaddedBounds } from './utils/spatial.js'
import { createMapLabelNavigator } from './utils/labels.js'
import { updateHighlightedFeatures } from './utils/highlightFeatures.js'

export default class MapLibreProvider {
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
   * @param {Object} options
   * @param {[number, number]=} options.center
   * @param {number=} options.zoom
   */
  setView ({ center, zoom }) {
    this.map.flyTo({
      center: center || this.getCenter(),
      zoom: zoom || this.getZoom(),
      duration: defaults.animationDuration
    })
  }

  zoomIn (zoomDelta) {
    this.map.easeTo({
      zoom: this.getZoom() + zoomDelta,
      duration: defaults.animationDuration
    })
  }

  zoomOut (zoomDelta) {
    this.map.easeTo({
      zoom: this.getZoom() - zoomDelta,
      duration: defaults.animationDuration
    })
  }

  panBy (offset) {
    this.map.panBy(offset, { duration: defaults.animationDuration })
  }

  fitToBounds (bounds) {
    this.map.fitBounds(bounds, { duration: defaults.animationDuration })
  }

  setPadding (padding) {
    this.map.setPadding(padding)
  }

  // ==========================
  // Feature highlighting
  // ==========================

  updateHighlightedFeatures (selectedFeatures, stylesMap) {
    const { LngLatBounds } = this.maplibreModule
    return updateHighlightedFeatures({ LngLatBounds, map: this.map, selectedFeatures, stylesMap })
  }

  // ==========================
  // Map label (keyboard-friendly)
  // ==========================

  highlightNextLabel (direction) {
    return this.labelNavigator?.highlightNextLabel(direction) || null
  }

  highlightLabelAtCenter () {
    return this.labelNavigator?.highlightLabelAtCenter() || null
  }

  clearHighlightedLabel () {
    return this.labelNavigator?.clearHighlightedLabel() || null
  }

  // ==========================
  // Read-only getters
  // ==========================

  /**
   * @returns {[number, number]}
   */
  getCenter () {
    const coord = this.map.getCenter()
    return [Number(coord.lng.toFixed(7)), Number(coord.lat.toFixed(7))]
  }

  getZoom () {
    return Number(this.map.getZoom().toFixed(7))
  }

  /**
   * @returns {[number, number, number, number]}
   */
  getBounds () {
    return this.map.getBounds().toArray().flat(1)
  }

  getFeaturesAtPoint (point) {
    return this.map.queryRenderedFeatures(point)
  }

  // ==========================
  // Spatial helpers
  // ==========================

  getAreaDimensions () {
    const { LngLatBounds } = this.maplibreModule
    return getAreaDimensions(getPaddedBounds(LngLatBounds, this.map)) // Use padded bounds
  }

  getCardinalMove (from, to) {
    return getCardinalMove(from, to)
  }

  getResolution () {
    return getResolution(this.map.getCenter(), this.map.getZoom())
  }

  mapToScreen (coords) {
    return this.map.project(coords)
  }

  screenToMap (point) {
    const { lng, lat } = this.map.unproject([point.x, point.y])
    return [lng, lat]
  }
}
