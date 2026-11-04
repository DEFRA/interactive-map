// src/plugins/mapStyles/EsriProvider.jsx
import { MapProvider } from '../../mapProvider.js'
import './esriProvider.scss'
import esriConfig from '@arcgis/core/config.js'
import TileInfo from '@arcgis/core/layers/support/TileInfo.js'
import EsriMap from '@arcgis/core/Map.js'
import MapView from '@arcgis/core/views/MapView.js'
import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer.js'
import Point from '@arcgis/core/geometry/Point.js'
import { defaults, supportedShortcuts } from './defaults.js'
import { attachAppEvents } from './appEvents.js'
import { attachMapEvents } from './mapEvents.js'
import { getAreaDimensions, getCardinalMove, getPaddedExtent } from './utils/spatial.js'
import { queryVectorTileFeatures } from './utils/query.js'
import { getExtentFromFlatCoords, getPointFromFlatCoords, getBboxFromGeoJSON, padExtent } from './utils/coords.js'
import { cleanDOM } from './utils/esriFixes.js'

export default class EsriProvider extends MapProvider {
  constructor ({ mapProviderConfig = {}, events, eventBus }) {
    super()
    this.events = events
    this.eventBus = eventBus
    this.capabilities = {
      supportedShortcuts,
      supportsMapSizes: false
    }
    Object.assign(this, mapProviderConfig)

    // Initialize arrays to track event handles
    this.mapEventHandles = []
    this.appEventHandles = []
  }

  get name () {
    return 'EsriProvider'
  }

  async initMap (config) {
    const { container, padding, mapStyle, mapSize, maxExtent } = config
    this.mapStyleId = mapStyle?.id
    this.mapSize = mapSize
    const { events, eventBus } = this

    if (this.setupConfig) {
      await this.setupConfig(esriConfig)
    }

    const baseTileLayer = new VectorTileLayer({ id: 'baselayer', url: mapStyle.url, visible: true })
    const map = new EsriMap({ layers: [baseTileLayer] })
    const geometry = maxExtent ? getExtentFromFlatCoords(maxExtent) : null

    const view = new MapView({
      spatialReference: 27700,
      container,
      map,
      zoom: config.zoom,
      center: getPointFromFlatCoords(config.center),
      maxExtent,
      constraints: {
        lods: TileInfo.create({ spatialReference: { wkid: 27700 } }).lods,
        snapToZoom: false,
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
        maxScale: 0,
        geometry,
        rotationEnabled: false
      },
      ui: { components: [] },
      popupEnabled: false
    })

    cleanDOM(view.container)
    view.padding = padding

    // Uses bounds internally
    if (config.bounds) {
      view.when(() => view.goTo(getExtentFromFlatCoords(config.bounds), { duration: 0 })) // NOSONAR: goTo rejects when a newer move interrupts it
    }

    // Attach map events and store handles
    this.mapEventHandles = attachMapEvents({
      mapProvider: this,
      map,
      view,
      baseTileLayer,
      events,
      eventBus,
      getZoom: this.getZoom.bind(this),
      getCenter: this.getCenter.bind(this),
      getBounds: this.getBounds.bind(this),
      getResolution: this.getResolution.bind(this)
    })

    // Attach app events and store handles
    this.appEventHandles = attachAppEvents({
      baseTileLayer,
      events,
      eventBus
    }) || []

    // Save references
    this.map = map
    this.view = view
    this.baseTileLayer = baseTileLayer
  }

  _isBaseMapReady = false
  setBaseMapReady (ready) {
    this._isBaseMapReady = ready
  }

  isBaseMapReady () {
    return this._isBaseMapReady
  }

  destroyMap () {
    this.mapEvents?.remove()
    this.appEvents?.remove()

    this.mapEvents = null
    this.appEvents = null

    if (this.view) {
      this.view.container = null
      this.view.destroy()
      this.view = null
    }

    if (this.map) {
      this.map.removeAll()
      this.map = null
    }
  }

  // ==========================
  // Side-effects
  // ==========================

  setView ({ center, zoom }) {
    this.view.animation?.destroy()
    const point = center ? new Point({ x: center[0], y: center[1], spatialReference: { wkid: 27700 } }) : this.view.center
    const target = { center: point, zoom: zoom ?? this.view.zoom }
    this.view.goTo({ ...target, duration: defaults.animationDuration }) // NOSONAR: goTo rejects when a newer move interrupts it
  }

  zoomIn (zoomDelta) {
    this.view.animation?.destroy()
    this.view.goTo({ zoom: this.view.zoom + zoomDelta, duration: defaults.animationDuration }) // NOSONAR: goTo rejects when a newer move interrupts it
  }

  zoomOut (zoomDelta) {
    this.view.animation?.destroy()
    this.view.goTo({ zoom: this.view.zoom - zoomDelta, duration: defaults.animationDuration }) // NOSONAR: goTo rejects when a newer move interrupts it
  }

  panBy (offset) {
    const { x, y } = this.view.toScreen(this.view.center)
    const newPixel = { x: x + offset[0], y: y + offset[1] }
    const newCentre = this.view.toMap(newPixel)
    this.view.goTo({ center: newCentre, duration: defaults.animationDuration }) // NOSONAR: goTo rejects when a newer move interrupts it
  }

  fitToBounds (bounds, { padding } = {}) {
    const extent = Array.isArray(bounds) ? getExtentFromFlatCoords(bounds) : getBboxFromGeoJSON(bounds)
    this.view.goTo(padding ? padExtent(extent, padding, this.view) : extent, { duration: defaults.DELAY }) // NOSONAR: goTo rejects when a newer move interrupts it
  }

  setPadding (padding) {
    this.view.padding = padding
  }

  // ==========================
  // Feature highlighting
  // ==========================

  // updateHighlightedFeatures () {}

  // ==========================
  // Read-only getters
  // ==========================

  getCenter () {
    const center = this.view.center
    return [center.x, center.y].map(n => Math.round(n * 100) / 100)
  }

  getZoom () {
    return this.view.zoom
  }

  getBounds () {
    const { xmin, ymin, xmax, ymax } = this.view.extent
    return [xmin, ymin, xmax, ymax].map(n => Math.round(n * 100) / 100)
  }

  getFeaturesAtPoint (point) {
    return queryVectorTileFeatures(this.view, point)
  }

  getVisibleFeatures (_layerIds) {
    return []
  }

  // ==========================
  // Spatial helpers
  // ==========================

  getAreaDimensions () {
    return getAreaDimensions(getPaddedExtent(this.view))
  }

  getCardinalMove (from, to) {
    return getCardinalMove(from, to)
  }

  getResolution () {
    return this.view.resolution
  }

  mapToScreen (coords) {
    const point = getPointFromFlatCoords(coords)
    const screenPoint = this.view.toScreen(point)
    return { x: screenPoint.x, y: screenPoint.y }
  }

  screenToMap (point) {
    const mapPoint = this.view.toMap(point)
    return [mapPoint.x, mapPoint.y]
  }
}
