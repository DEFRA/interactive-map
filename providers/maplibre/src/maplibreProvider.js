/**
 * @typedef {import('../../../src/types.js').MapProvider} MapProvider
 * @typedef {import('../../../src/types.js').MapProviderConfig} MapProviderConfig
 */
import { MapProvider } from '../../mapProvider.js'
import { DEFAULTS, supportedShortcuts } from './defaults.js'
import { cleanCanvas, applyPreventDefaultFix } from './utils/maplibreFixes.js'
import { attachMapEvents } from './mapEvents.js'
import { attachAppEvents } from './appEvents.js'
import { getAreaDimensions, getCardinalMove, getBboxFromGeoJSON, getResolution, getPaddedBounds } from './utils/spatial.js'
import { createMapLabelNavigator } from './utils/labels.js'
import { updateHighlightedFeatures } from './utils/highlightFeatures.js'
import { queryFeatures } from './utils/queryFeatures.js'
import { setupHoverCursor } from './utils/hoverCursor.js'
import { SymbolImageVariants, getSymbolIconLayout } from './utils/symbolImages.js'
import { PatternImages } from './utils/patternImages.js'
import { BNG_CRS, BNG_RESOLUTION_AT_ZOOM_0 } from './utils/bngProjection.js'
import { createCoordinateConverter } from './utils/coordinates.js'
import { getZoomOffset } from './utils/zoom.js'

/**
 * MapLibre GL JS implementation of the MapProvider interface.
 *
 * @implements {MapProvider}
 */
export default class MapLibreProvider extends MapProvider {
  /**
   * @param {Object} options - Constructor options.
   * @param {any} options.mapFramework - The MapLibre GL JS module.
   * @param {MapProviderConfig} [options.mapProviderConfig={}] - Provider configuration.
   * @param {Object} options.events - Event name constants.
   * @param {Object} options.eventBus - Event emitter for publishing map events.
   */
  constructor ({ mapFramework, mapProviderConfig = {}, events, eventBus }) {
    super()
    this.maplibreModule = mapFramework
    this.events = events
    this.eventBus = eventBus
    this.capabilities = {
      supportedShortcuts,
      supportsMapSizes: true
    }
    // Spread all config properties onto the instance
    Object.assign(this, mapProviderConfig)
    // Converts between the map's CRS and the lng/lat MapLibre's own API uses
    this.coordinates = createCoordinateConverter(this.crsProjection)
    // Added to API zooms to get MapLibre's own, so EPSG:27700 zooms match the other providers'
    this.zoomOffset = getZoomOffset(this.crs, this.zoomAlignment)
  }

  get name () {
    return 'MapLibreProvider'
  }

  /**
   * Initialize the map.
   *
   * @param {Object} config - Map initialization configuration.
   * @returns {Promise<void>}
   */
  async initMap (config) {
    const { container, padding, mapStyle, mapSize, center, zoom, bounds, pixelRatio, minZoom, maxZoom, ...initConfig } = config
    this.mapStyleId = mapStyle?.id
    this.mapSize = mapSize
    const { Map: MaplibreMap } = this.maplibreModule
    const { events, eventBus } = this

    const map = new MaplibreMap({
      ...initConfig,
      container,
      style: mapStyle?.url,
      // Kept by MapLibre for later setStyle calls, so switched styles render in the same projection
      ...(this.crs === BNG_CRS && {
        transformStyle: (_previousStyle, nextStyle) => ({ ...nextStyle, projection: { type: 'EPSG:27700' } })
      }),
      pixelRatio,
      padding,
      center: center && this.coordinates.toLngLat(center),
      zoom: this.toMapLibreZoom(zoom),
      ...(minZoom !== undefined && { minZoom: this.toMapLibreZoom(minZoom) }),
      ...(maxZoom !== undefined && { maxZoom: this.toMapLibreZoom(maxZoom) }),
      fadeDuration: 0,
      attributionControl: false,
      dragRotate: false,
      doubleClickZoom: false
    })

    // Disable rotation
    map.touchZoomRotate.disableRotation()

    // map.showPadding = true
    this.map = map
    this.symbolImages = new SymbolImageVariants(map)
    this.patternImages = new PatternImages(map)

    // Set padding before bounds
    this.map.setPadding(padding)

    // Set bounds after padding. A registered projection only applies once the style has loaded, so
    // fitting the bounds before then would choose a Web Mercator zoom.
    if (bounds) {
      const fitInitialBounds = () => map.fitBounds(this.coordinates.bboxToLngLat(bounds), { duration: 0 })
      if (this.crs === BNG_CRS) {
        map.once('style.load', fitInitialBounds)
      } else {
        fitInitialBounds()
      }
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
      getResolution: this.getResolution.bind(this),
      fromLngLat: this.coordinates.fromLngLat,
      zoomOffset: this.zoomOffset
    })

    attachAppEvents({
      mapProvider: this,
      map,
      events,
      eventBus
    })

    // Add highlight layer after map load
    map.on('load', () => {
      this.labelNavigator = createMapLabelNavigator(map, mapStyle?.mapColorScheme, events, eventBus)
    })

    this.eventBus.emit(events.MAP_READY, {
      map: this.map,
      mapStyleId: this.mapStyleId,
      mapSize: this.mapSize,
      crs: this.crs
    })
  }

  isBaseMapReady () {
    return Boolean(this.map?.getStyle())
  }

  /** Destroy the map and clean up resources. */
  destroyMap () {
    this.setHoverCursor([])
    this.mapEvents?.remove()
    this.appEvents?.remove()

    this.mapEvents = null
    this.appEvents = null

    this.map.remove()
  }

  /**
   * Set pointer cursor on the map canvas when hovering over any of the given layer IDs.
   * Call with an empty array to remove all hover cursor listeners.
   *
   * @param {string[]} layerIds
   */
  setHoverCursor (layerIds) {
    if (!this.map) {
      return
    }
    this._onHoverMove = setupHoverCursor(this.map, layerIds, this._onHoverMove)
  }

  // ==========================
  // Side-effects
  // ==========================

  /**
   * Set map view with optional center and zoom.
   *
   * @param {Object} options - View options.
   * @param {[number, number]} [options.center] - Center coordinates in the map's CRS.
   * @param {number} [options.zoom] - Zoom level.
   */
  setView ({ center, zoom }) {
    this.map.flyTo({
      center: this.coordinates.toLngLat(center || this.getCenter()),
      zoom: this.toMapLibreZoom(zoom || this.getZoom()),
      duration: this.map.isStyleLoaded() ? DEFAULTS.animationDuration : 0
    })
  }

  /**
   * Zoom in by delta.
   *
   * @param {number} zoomDelta - Amount to zoom in.
   */
  zoomIn (zoomDelta) {
    this.map.easeTo({
      zoom: this.toMapLibreZoom(this.getZoom() + zoomDelta),
      duration: DEFAULTS.animationDuration
    })
  }

  /**
   * Zoom out by delta.
   *
   * @param {number} zoomDelta - Amount to zoom out.
   */
  zoomOut (zoomDelta) {
    this.map.easeTo({
      zoom: this.toMapLibreZoom(this.getZoom() - zoomDelta),
      duration: DEFAULTS.animationDuration
    })
  }

  /**
   * Pan map by pixel offset [x, y]. Positive x pans right, positive y pans down.
   *
   * @param {[number, number]} offset - Pixel offset [x, y].
   */
  panBy (offset) {
    this.map.panBy(offset, { duration: DEFAULTS.animationDuration })
  }

  /**
   * Fit map view to the specified bounds or GeoJSON geometry.
   *
   * @param {[number, number, number, number] | object} bounds - Bounds as [west, south, east, north], or a GeoJSON Feature, FeatureCollection, or geometry. Bbox is computed from GeoJSON using @turf/bbox.
   * @param {Object} [options]
   * @param {{ top: number, right: number, bottom: number, left: number }} [options.padding] - Extra space in pixels kept around the bounds, inside the map's padding.
   */
  fitToBounds (bounds, { padding } = {}) {
    const bbox = Array.isArray(bounds)
      ? this.coordinates.bboxToLngLat(bounds)
      : getBboxFromGeoJSON(this.coordinates.geojsonToLngLat(bounds))
    const duration = this.map.isStyleLoaded() ? DEFAULTS.animationDuration : 0
    this.map.fitBounds(bbox, { duration, ...(padding && { padding }) })
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
  updateHighlightedFeatures (selectedFeatures, activeFeatures, stylesMap) {
    const { LngLatBounds } = this.maplibreModule
    const bounds = updateHighlightedFeatures({ LngLatBounds, map: this.map, selectedFeatures, activeFeatures, stylesMap, symbolImages: this.symbolImages })
    return bounds && this.coordinates.bboxFromLngLat(bounds)
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
   * Get current center coordinates in the map's CRS.
   *
   * @returns {[number, number]}
   */
  getCenter () {
    const { lng, lat } = this.map.getCenter()
    return this.coordinates.fromLngLat([lng, lat]).map(value => Number(value.toFixed(DEFAULTS.coordinatePrecision)))
  }

  /**
   * Get current zoom level.
   *
   * @returns {number}
   */
  getZoom () {
    return Number((this.map.getZoom() - this.zoomOffset).toFixed(DEFAULTS.coordinatePrecision))
  }

  /**
   * Convert an API zoom to MapLibre's own zoom. They differ in EPSG:27700, where API zooms follow
   * the zoomAlignment levels. An undefined zoom stays undefined.
   *
   * @param {number} [zoom]
   * @returns {number|undefined}
   */
  toMapLibreZoom (zoom) {
    return zoom === undefined || zoom === null ? zoom : zoom + this.zoomOffset
  }

  /**
   * Get current bounds as [west, south, east, north] in the map's CRS.
   *
   * @returns {[number, number, number, number]}
   */
  getBounds () {
    if (this.crs === BNG_CRS) {
      // The view is a rectangle of eastings and northings, so its corners are exact
      const { clientWidth, clientHeight } = this.map.getCanvas()
      const [minX, minY] = this.screenToMap({ x: 0, y: clientHeight })
      const [maxX, maxY] = this.screenToMap({ x: clientWidth, y: 0 })
      return [minX, minY, maxX, maxY]
    }
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
    return this._toMapCrsFeatures(queryFeatures(this.map, point, options))
  }

  getVisibleFeatures (layerIds) {
    const presentLayers = layerIds.filter(id => this.map.getLayer(id))
    if (!presentLayers.length) {
      return []
    }
    return this._toMapCrsFeatures(this.map.queryRenderedFeatures(undefined, { layers: presentLayers }))
  }

  // MapLibre returns feature geometry in lng/lat; callers get it in the map's CRS. Each query
  // returns new feature objects, so their geometry is replaced in place, which keeps MapLibre's
  // own feature properties (layer, source, state). A lng/lat map's geometry isn't touched.
  _toMapCrsFeatures (features) {
    if (!this.crsProjection) {
      return features
    }
    features.forEach(feature => {
      feature.geometry = this.coordinates.geojsonFromLngLat(feature.geometry)
    })
    return features
  }

  /**
   * Rasterises each symbol's normal, active and selected images, adds them to the map, and
   * records which active and selected image belongs to each normal one. Images the map already
   * has are reused.
   *
   * The pixel ratio is the device pixel ratio × map size scale factor, so symbols are
   * rasterised at the right resolution for the current device DPI and map size.
   *
   * @param {Object[]} symbolConfigs - an array of symbol configs
   * @param {Object} mapStyle - Current map style config (provides id, selectedColor, haloColor)
   * @param {Object} symbolRegistry
   * @param {number} [pixelRatio] - defaults to the map's current pixel ratio
   * @returns {Promise<void>}
   */
  async addSymbolsToMap (symbolConfigs, mapStyle, symbolRegistry, pixelRatio = this.map.getPixelRatio() || 1) {
    return this.symbolImages.registerSymbols(symbolConfigs, mapStyle, symbolRegistry, pixelRatio)
  }

  /**
   * The icon-anchor and icon-offset layout properties that place a symbol image on its point.
   * icon-anchor has only 9 positions, so icon-offset makes up the difference to the symbol's
   * exact anchor.
   *
   * @param {Object} symbolDef - a sized symbol definition (symbolRegistry.getSymbolDef)
   * @returns {{ 'icon-anchor': string, 'icon-offset': number[] }}
   */
  getSymbolIconLayout (symbolDef) {
    return getSymbolIconLayout(symbolDef)
  }

  /**
   * The imageId of a registered symbol's active (keyboard cursor) variant.
   *
   * @param {string} normalImageId
   * @returns {string|null}
   */
  getActiveSymbolImageId (normalImageId) {
    return this.symbolImages?.getActiveImageId(normalImageId) ?? null
  }

  /**
   * The imageId of a registered symbol's selected variant.
   *
   * @param {string} normalImageId
   * @returns {string|null}
   */
  getSelectedSymbolImageId (normalImageId) {
    return this.symbolImages?.getSelectedImageId(normalImageId) ?? null
  }

  /**
   * Rasterises each pattern's image and adds it to the map. Images the map already has are
   * reused.
   *
   * @param {Object[]} patternConfigs - an array of pattern configs
   * @param {string} mapStyleId
   * @param {Object} patternRegistry
   * @param {number} [pixelRatio] - defaults to the map's current pixel ratio
   * @returns {Promise<void>}
   */
  async addPatternsToMap (patternConfigs, mapStyleId, patternRegistry, pixelRatio = this.map.getPixelRatio() || 1) {
    return this.patternImages.registerPatterns(patternConfigs, mapStyleId, patternRegistry, pixelRatio)
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
   * Get cardinal direction and distance between two coordinates in the map's CRS. Returns a formatted string (e.g., 'north 400m' or 'south 400m, west 750m').
   *
   * @param {[number, number]} from - Start coordinates in the map's CRS.
   * @param {[number, number]} to - End coordinates in the map's CRS.
   * @returns {string}
   */
  getCardinalMove (from, to) {
    return getCardinalMove(this.coordinates.toLngLat(from), this.coordinates.toLngLat(to))
  }

  /**
   * Get map resolution in metres per pixel.
   *
   * @returns {number}
   */
  getResolution () {
    if (this.crs === BNG_CRS) {
      return BNG_RESOLUTION_AT_ZOOM_0 / 2 ** this.map.getZoom()
    }
    return getResolution(this.map.getCenter(), this.map.getZoom())
  }

  /**
   * Convert map coordinates in the map's CRS to screen pixel position (x from left edge, y from top edge of viewport).
   *
   * @param {[number, number]} coords - Map coordinates in the map's CRS.
   * @returns {{ x: number, y: number }} Screen pixel position.
   */
  mapToScreen (coords) {
    return this.map.project(this.coordinates.toLngLat(coords))
  }

  /**
   * Convert screen pixel position (x from left edge, y from top edge of viewport) to map coordinates in the map's CRS.
   *
   * @param {{ x: number, y: number }} point - Screen pixel position.
   * @returns {[number, number]} Map coordinates in the map's CRS.
   */
  screenToMap (point) {
    const { lng, lat } = this.map.unproject([point.x, point.y])
    return this.coordinates.fromLngLat([lng, lat])
  }

  /**
   * Convert GeoJSON in the map's CRS to the lng/lat MapLibre's sources take. Returns it unchanged in EPSG:4326.
   *
   * @param {object} geojson - A GeoJSON FeatureCollection, Feature or geometry.
   * @returns {object}
   */
  geojsonToLngLat (geojson) {
    return this.coordinates.geojsonToLngLat(geojson)
  }

  /**
   * Convert GeoJSON in MapLibre's lng/lat to the map's CRS. Returns it unchanged in EPSG:4326.
   *
   * @param {object} geojson - A GeoJSON FeatureCollection, Feature or geometry.
   * @returns {object}
   */
  geojsonFromLngLat (geojson) {
    return this.coordinates.geojsonFromLngLat(geojson)
  }
}
