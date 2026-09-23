/**
 * @typedef {import('../../../../src/types.js').MapProvider} MapProvider
 * @typedef {import('../../../../src/types.js').MapProviderConfig} MapProviderConfig
 */
import { MapProvider } from '../../../mapProvider.js'
import OlMap from 'ol/Map.js'
import View from 'ol/View.js'
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js'
import { getCenter as getExtentCenter } from 'ol/extent.js'
import { BNG_CRS } from './utils/bngProjection.js'
import { supportedShortcuts, DEFAULTS } from './defaults.js'
import { getViewResolutionConfig, ZOOM_ALIGNMENT } from './utils/zoom.js'
import { attachMapEvents } from './mapEvents.js'
import { attachAppEvents, createMapStyleLayer } from './appEvents.js'
import { getAreaDimensions, getCardinalMove, getExtentFromGeoJSON, getPaddedExtent, isGeometryObscured } from './utils/spatial.js'
import { updateHighlightedFeatures } from './utils/highlightFeatures.js'
import { queryFeatures, getVisibleFeatures } from './utils/queryFeatures.js'
import { collectTileFragments } from './utils/vtTileFragments.js'
import { setupHoverCursor } from './utils/hoverCursor.js'
import { applyOpenLayersFixes } from './utils/openLayersFixes.js'

applyOpenLayersFixes()

const CRS = BNG_CRS

const toPaddingArray = (padding) => {
  if (!padding) {
    return undefined
  }
  const { top = 0, right = 0, bottom = 0, left = 0 } = padding
  return [top, right, bottom, left]
}

/**
 * OpenLayers implementation of the MapProvider interface.
 *
 * @implements {MapProvider}
 */
export default class OpenLayersProvider extends MapProvider {
  /**
   * @param {Object} options - Constructor options.
   * @param {MapProviderConfig} [options.mapProviderConfig={}] - Provider configuration.
   * @param {Object} options.events - Event name constants.
   * @param {Object} options.eventBus - Event emitter for publishing map events.
   */
  constructor ({ mapProviderConfig = {}, events, eventBus }) {
    super()
    this.events = events
    this.eventBus = eventBus
    this.capabilities = {
      supportedShortcuts,
      supportsMapSizes: true
    }
    Object.assign(this, mapProviderConfig)
  }

  get name () {
    return 'OpenLayersProvider'
  }

  // Unlike MapLibre, initMap() awaits the OL style/sprite fetch before constructing the map, so
  // the base map is already loaded by the time this.map is set.
  isBaseMapReady () {
    return Boolean(this.map)
  }

  /**
   * Initialize the map.
   *
   * @param {Object} config - Map initialization configuration.
   * @returns {Promise<void>}
   */
  async initMap (config) {
    const { container, padding, mapStyle, mapSize, center, zoom, bounds, minZoom, maxZoom, transformRequest, pixelRatio } = config
    this.mapStyleId = mapStyle?.id
    this.mapSize = mapSize
    const { events, eventBus } = this

    const { layer: tileLayer, source } = await createMapStyleLayer(mapStyle, transformRequest)

    const viewResolutions = getViewResolutionConfig(this.zoomAlignment ?? ZOOM_ALIGNMENT.UK)

    // A View with no center never renders a frame, so 'rendercomplete' below (which applies
    // `bounds`) would never fire — fall back to the bounds' own center so it can.
    const view = new View({
      projection: CRS,
      center: center ?? (bounds ? getExtentCenter(bounds) : undefined),
      zoom: zoom ?? viewResolutions.defaultMinZoom,
      minZoom: minZoom ?? viewResolutions.defaultMinZoom,
      maxZoom: maxZoom ?? viewResolutions.maxZoom,
      resolutions: viewResolutions.resolutions,
      constrainResolution: false,
      padding: toPaddingArray(padding)
    })

    const map = new OlMap({
      target: container,
      layers: [tileLayer],
      view,
      controls: [],
      interactions: defaultInteractions({ doubleClickZoom: false }),
      pixelRatio
    })

    if (bounds) {
      map.once('rendercomplete', () => {
        view.fit(bounds, { size: map.getSize(), duration: 0 })
      })
    }

    this.mapEventHandles = attachMapEvents({
      map,
      source,
      events,
      eventBus,
      getZoom: this.getZoom.bind(this),
      getCenter: this.getCenter.bind(this),
      getBounds: this.getBounds.bind(this),
      getResolution: this.getResolution.bind(this)
    })

    this.appEventHandles = attachAppEvents({
      mapProvider: this,
      transformRequest,
      events,
      eventBus,
      map,
      onBaseSourceChange: this.mapEventHandles.setSource
    }) || []

    this.map = map
    this.view = view

    // MAP_READY is synchronous — OL map is immediately interactive after construction
    eventBus.emit(events.MAP_READY, {
      map: this.map,
      mapStyleId: this.mapStyleId,
      mapSize: this.mapSize,
      crs: this.crs
    })
  }

  /** Destroy the map and clean up resources. */
  destroyMap () {
    this.mapEventHandles?.remove()
    this.appEventHandles?.remove()

    this.mapEventHandles = null
    this.appEventHandles = null

    if (this.map) {
      if (this._onHoverMove) {
        this.map.un('pointermove', this._onHoverMove)
        this._onHoverMove = null
      }
      this.map.setTarget(null)
      this.map = null
    }

    this.view = null
  }

  // ==========================
  // Side-effects
  // ==========================

  /**
   * Set map view with optional center and zoom.
   *
   * @param {Object} options - View options.
   * @param {[number, number]} [options.center] - Center coordinates [easting, northing].
   * @param {number} [options.zoom] - Zoom level.
   */
  setView ({ center, zoom }) {
    this.view.animate({
      center: center ?? this.view.getCenter(),
      zoom: zoom ?? this.view.getZoom(),
      duration: DEFAULTS.animationDuration
    })
  }

  /**
   * Zoom in by delta.
   *
   * @param {number} zoomDelta - Amount to zoom in.
   */
  zoomIn (zoomDelta) {
    this.view.animate({
      zoom: this.view.getZoom() + zoomDelta,
      duration: DEFAULTS.animationDuration
    })
  }

  /**
   * Zoom out by delta.
   *
   * @param {number} zoomDelta - Amount to zoom out.
   */
  zoomOut (zoomDelta) {
    this.view.animate({
      zoom: this.view.getZoom() - zoomDelta,
      duration: DEFAULTS.animationDuration
    })
  }

  /**
   * Pan map by pixel offset [x, y]. Positive x pans right, positive y pans down.
   *
   * @param {[number, number]} offset - Pixel offset [x, y].
   */
  panBy (offset) {
    const center = this.view.getCenter()
    const resolution = this.view.getResolution()
    // Pixel x/y → easting increases right, northing increases up (flip y)
    this.view.animate({
      center: [center[0] + offset[0] * resolution, center[1] - offset[1] * resolution],
      duration: DEFAULTS.animationDuration
    })
  }

  /**
   * Fit map view to the specified bounds or GeoJSON geometry.
   *
   * @param {[number, number, number, number] | object} bounds - Bounds as [west, south, east, north] (BNG easting/northing), or a GeoJSON Feature, FeatureCollection, or geometry.
   */
  fitToBounds (bounds) {
    const extent = Array.isArray(bounds) ? bounds : getExtentFromGeoJSON(bounds)
    this.view.fit(extent, { duration: DEFAULTS.animationDuration })
  }

  /**
   * Set map padding as pixel insets from the top, bottom, left and right edges of the map.
   *
   * @param {{ top?: number, bottom?: number, left?: number, right?: number }} padding - Padding in pixels.
   */
  setPadding (padding) {
    this.view.padding = toPaddingArray(padding)
  }

  // ==========================
  // Read-only getters
  // ==========================

  /**
   * Get current center coordinates [easting, northing].
   *
   * @returns {[number, number]}
   */
  getCenter () {
    const center = this.view.getCenter()
    const p = DEFAULTS.coordinatePrecision
    return [
      Math.round(center[0] * Math.pow(10, p)) / Math.pow(10, p),
      Math.round(center[1] * Math.pow(10, p)) / Math.pow(10, p)
    ]
  }

  /**
   * Get current zoom level.
   *
   * @returns {number}
   */
  getZoom () {
    return this.view.getZoom()
  }

  /**
   * Get current bounds as [west, south, east, north] (BNG easting/northing).
   *
   * @returns {[number, number, number, number]}
   */
  getBounds () {
    const extent = this.view.calculateExtent(this.map.getSize())
    return extent.map(n => Math.round(n * 100) / 100)
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

  /**
   * Get a feature's full geometry, stitched from its vector-tile fragments. A feature that
   * spans multiple tiles is otherwise only visible as whichever single fragment was clicked —
   * this combines every loaded fragment sharing the same id into one Polygon/MultiPolygon.
   *
   * @param {string} layerId
   * @param {string|number} featureId
   * @param {string} [idProperty] - Feature property to match on, if not using the tile's native feature id.
   * @returns {object|null} A GeoJSON Polygon or MultiPolygon geometry, or null if no fragments were found.
   */
  getFeatureGeometry (layerId, featureId, idProperty) {
    const fragments = collectTileFragments(this.map, layerId, featureId, idProperty)
    if (fragments.length === 0) { return null }
    if (fragments.length === 1) { return fragments[0] }
    const coords = fragments.flatMap(g => g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates])
    return { type: 'MultiPolygon', coordinates: coords }
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

  /**
   * Get every currently rendered feature across the given layer IDs (not scoped to a point or
   * area, unlike getFeaturesAtPoint).
   *
   * @param {string[]} layerIds
   * @returns {any[]}
   */
  getVisibleFeatures (layerIds) {
    return getVisibleFeatures(this.map, layerIds)
  }

  /**
   * @experimental Update highlighted features on the map. Remembers its arguments (see
   * reapplyHighlights) since, unlike MapLibre, a basemap style change here swaps in a fresh
   * base layer/source that highlights must be explicitly re-applied against.
   *
   * @param {any[]} selectedFeatures - Features to highlight.
   * @param {any} activeFeatures - Features to highlight with the keyboard cursor ring.
   * @param {any} stylesMap - Style configuration for highlighting.
   * @returns {any}
   */
  updateHighlightedFeatures (selectedFeatures, activeFeatures, stylesMap) {
    this._lastHighlightArgs = { selectedFeatures, activeFeatures, stylesMap }
    return updateHighlightedFeatures(this.map, selectedFeatures, activeFeatures, stylesMap)
  }

  /**
   * Re-applies the last updateHighlightedFeatures call. Called after a basemap style change
   * (see appEvents.js's handleSetMapStyle) — MAP_DATA_CHANGE won't fire for the new base
   * layer's source, so highlights would otherwise be lost silently until the next selection
   * change.
   */
  reapplyHighlights () {
    if (!this._lastHighlightArgs) {
      return
    }
    const { selectedFeatures, activeFeatures, stylesMap } = this._lastHighlightArgs
    updateHighlightedFeatures(this.map, selectedFeatures, activeFeatures, stylesMap)
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
    return getAreaDimensions(getPaddedExtent(this.map))
  }

  /**
   * Get cardinal direction and distance between two coordinates [easting, northing]. Returns a formatted string (e.g., 'north 400m' or 'south 400m, west 750m').
   *
   * @param {[number, number]} from - Start coordinates [easting, northing].
   * @param {[number, number]} to - End coordinates [easting, northing].
   * @returns {string}
   */
  getCardinalMove (from, to) {
    return getCardinalMove(from, to)
  }

  /**
   * Get map resolution in metres per pixel.
   *
   * @returns {number}
   */
  getResolution () {
    return this.view.getResolution()
  }

  /**
   * Convert map coordinates [easting, northing] to screen pixel position (x from left edge, y from top edge of viewport).
   *
   * @param {[number, number]} coords - Map coordinates [easting, northing].
   * @returns {{ x: number, y: number }} Screen pixel position.
   */
  mapToScreen (coords) {
    if (!this.map) {
      return { x: 0, y: 0 }
    }
    const pixel = this.map.getPixelFromCoordinate(coords)
    if (!pixel) {
      return { x: 0, y: 0 }
    }
    return { x: pixel[0], y: pixel[1] }
  }

  /**
   * Convert screen pixel position (x from left edge, y from top edge of viewport) to map coordinates [easting, northing].
   *
   * @param {{ x: number, y: number }} point - Screen pixel position.
   * @returns {[number, number]} Map coordinates [easting, northing].
   */
  screenToMap (point) {
    return this.map.getCoordinateFromPixel([point.x, point.y])
  }

  /**
   * Returns true if the geometry's screen bounding box overlaps the given panel rectangle.
   *
   * @param {object} geojson - GeoJSON Feature, FeatureCollection, or geometry.
   * @param {DOMRect} panelRect - Bounding rect of the panel element (viewport coordinates).
   * @returns {boolean}
   */
  isGeometryObscured (geojson, panelRect) {
    return isGeometryObscured(geojson, panelRect, this.map)
  }
}
