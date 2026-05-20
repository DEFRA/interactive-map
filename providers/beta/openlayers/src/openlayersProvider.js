import OlMap from 'ol/Map.js'
import View from 'ol/View.js'
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js'
import proj4 from 'proj4'
import { register } from 'ol/proj/proj4.js'
import { supportedShortcuts, DEFAULTS } from './defaults.js'
import { getViewResolutionConfig, ZOOM_ALIGNMENT } from './utils/zoom.js'
import { attachMapEvents } from './mapEvents.js'
import { attachAppEvents, createMapStyleLayer } from './appEvents.js'
import { getAreaDimensions, getCardinalMove, getExtentFromGeoJSON, getPaddedExtent, isGeometryObscured } from './utils/spatial.js'

const CRS = 'EPSG:27700'

// OL view padding is [top, right, bottom, left]; app passes { top, right, bottom, left }
const toPaddingArray = (padding) => {
  if (!padding) {
    return undefined
  }
  const { top = 0, right = 0, bottom = 0, left = 0 } = padding
  return [top, right, bottom, left]
}

// Register British National Grid with proj4 so OL can use it
proj4.defs(CRS, '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs')
register(proj4)

export default class OpenLayersProvider {
  constructor ({ mapProviderConfig = {}, events, eventBus }) {
    this.events = events
    this.eventBus = eventBus
    this.capabilities = {
      supportedShortcuts,
      supportsMapSizes: true
    }
    Object.assign(this, mapProviderConfig)
  }

  async initMap (config) {
    const { container, padding, mapStyle, mapSize, center, zoom, bounds, minZoom, maxZoom, transformRequest, pixelRatio } = config
    this.mapStyleId = mapStyle?.id
    this.mapSize = mapSize
    const { events, eventBus } = this

    const { layer: tileLayer, source } = await createMapStyleLayer(mapStyle, transformRequest)

    const viewResolutions = getViewResolutionConfig(this.zoomAlignment ?? ZOOM_ALIGNMENT.UK)

    const view = new View({
      projection: CRS,
      center,
      zoom: zoom ?? viewResolutions.defaultMinZoom,
      minZoom: Math.max(minZoom ?? viewResolutions.defaultMinZoom, viewResolutions.defaultMinZoom),
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

  destroyMap () {
    this.mapEventHandles?.remove()
    this.appEventHandles?.remove()

    this.mapEventHandles = null
    this.appEventHandles = null

    if (this.map) {
      this.map.setTarget(null)
      this.map = null
    }

    this.view = null
  }

  // ==========================
  // Side-effects
  // ==========================

  setView ({ center, zoom }) {
    this.view.animate({
      center: center ?? this.view.getCenter(),
      zoom: zoom ?? this.view.getZoom(),
      duration: DEFAULTS.animationDuration
    })
  }

  zoomIn (zoomDelta) {
    this.view.animate({
      zoom: this.view.getZoom() + zoomDelta,
      duration: DEFAULTS.animationDuration
    })
  }

  zoomOut (zoomDelta) {
    this.view.animate({
      zoom: this.view.getZoom() - zoomDelta,
      duration: DEFAULTS.animationDuration
    })
  }

  panBy (offset) {
    const center = this.view.getCenter()
    const resolution = this.view.getResolution()
    // Pixel x/y → easting increases right, northing increases up (flip y)
    this.view.animate({
      center: [center[0] + offset[0] * resolution, center[1] - offset[1] * resolution],
      duration: DEFAULTS.animationDuration
    })
  }

  fitToBounds (bounds) {
    const extent = Array.isArray(bounds) ? bounds : getExtentFromGeoJSON(bounds)
    this.view.fit(extent, { duration: DEFAULTS.animationDuration })
  }

  setPadding (padding) {
    this.view.padding = toPaddingArray(padding)
  }

  // ==========================
  // Read-only getters
  // ==========================

  getCenter () {
    const center = this.view.getCenter()
    const p = DEFAULTS.coordinatePrecision
    return [
      Math.round(center[0] * Math.pow(10, p)) / Math.pow(10, p),
      Math.round(center[1] * Math.pow(10, p)) / Math.pow(10, p)
    ]
  }

  getZoom () {
    return this.view.getZoom()
  }

  getBounds () {
    const extent = this.view.calculateExtent(this.map.getSize())
    return extent.map(n => Math.round(n * 100) / 100)
  }

  getFeaturesAtPoint (_point, _options) {
    // Raster tiles have no queryable features
    return []
  }

  getVisibleFeatures (_layerIds) {
    return []
  }

  // ==========================
  // Spatial helpers
  // ==========================

  getAreaDimensions () {
    return getAreaDimensions(getPaddedExtent(this.map))
  }

  getCardinalMove (from, to) {
    return getCardinalMove(from, to)
  }

  getResolution () {
    return this.view.getResolution()
  }

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

  screenToMap (point) {
    return this.map.getCoordinateFromPixel([point.x, point.y])
  }

  isGeometryObscured (geojson, panelRect) {
    return isGeometryObscured(geojson, panelRect, this.map)
  }
}
