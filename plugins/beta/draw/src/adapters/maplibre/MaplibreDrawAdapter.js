import { createMapboxDraw } from './mapboxDraw.js'
import { getSnapInstance, clearSnapState, clearSnapIndicator } from './utils/snapHelpers.js'

const createEventBus = () => {
  const listeners = new Map()
  return {
    on (type, handler) {
      if (!listeners.has(type)) { listeners.set(type, new Set()) }
      listeners.get(type).add(handler)
    },
    off (type, handler) { listeners.get(type)?.delete(handler) },
    emit (type, ...args) {
      const handlers = listeners.get(type)
      if (handlers) { [...handlers].forEach(h => h(...args)) }
    }
  }
}

/**
 * Draw adapter for MapLibre GL.
 *
 * Wraps the MapboxDraw instance and normalises its map-event-based API into the
 * shared adapter interface consumed by events.js, DrawInit, and the api entry points.
 *
 * Adapter interface (also implemented by OLDrawAdapter):
 *   changeMode(name, options)
 *   getMode()
 *   setInterfaceType(type)
 *   done() / cancel() / undo() / deleteVertex()
 *   get(id) / add(feature) / delete(id) / deleteAll()
 *   setSnapEnabled(bool) / setSnapLayers(layers) / isSnapEnabled()
 *   on(event, handler) / off(event, handler)
 *   remove()
 */
export class MaplibreDrawAdapter {
  constructor (mapProvider, options) {
    this._mapProvider = mapProvider
    this._map = mapProvider.map
    this._bus = createEventBus()
    this._editingFeatureId = null

    const { draw, remove } = createMapboxDraw({
      mapStyle: options.mapStyle,
      mapProvider,
      events: options.events,
      eventBus: options.eventBus,
      snapLayers: options.snapLayers
    })

    this._draw = draw
    this._cleanupDraw = remove

    // Normalise ML map events → shared adapter event bus.
    // draw-ol emits these same event names directly from OLDrawManager.
    this._mapHandlers = {
      create: (e) => this._bus.emit('create', e.features[0]),
      editfinish: (e) => this._bus.emit('editfinish', e.features[0]),
      cancel: () => this._bus.emit('cancel'),
      // Normalise typo: draw-ml fires numVertecies, shared interface uses numVertices
      vertexselection: (e) => this._bus.emit('vertexselection', { ...e, numVertices: e.numVertecies }),
      vertexchange: (e) => this._bus.emit('vertexchange', { ...e, numVertices: e.numVertecies }),
      undochange: (e) => this._bus.emit('undochange', e.length),
      update: (e) => this._bus.emit('update', e.features[0]),
      geometrychange: (e) => this._bus.emit('geometrychange', e),
      modechange: (e) => this._handleModeChange(e),
      styledata: () => this._handleStyleData()
    }

    this._map.on('draw.create', this._mapHandlers.create)
    this._map.on('draw.editfinish', this._mapHandlers.editfinish)
    this._map.on('draw.cancel', this._mapHandlers.cancel)
    this._map.on('draw.vertexselection', this._mapHandlers.vertexselection)
    this._map.on('draw.vertexchange', this._mapHandlers.vertexchange)
    this._map.on('draw.undochange', this._mapHandlers.undochange)
    this._map.on('draw.update', this._mapHandlers.update)
    this._map.on('draw.geometrychange', this._mapHandlers.geometrychange)
    this._map.on('draw.modechange', this._mapHandlers.modechange)
    this._map.on('styledata', this._mapHandlers.styledata)
  }

  changeMode (name, options = {}) {
    if (name === 'edit_vertex') {
      this._editingFeatureId = options.featureId ?? null
    }
    this._draw.changeMode(name, options)
  }

  getMode () { return this._draw.getMode() }

  setInterfaceType (type) {
    this._map.fire('draw.interfacetypechange', { interfaceType: type })
  }

  done () {
    this._mapProvider.undoStack?.clear()
    const mode = this._draw.getMode()
    if (mode === 'edit_vertex' && this._editingFeatureId) {
      this._map.fire('draw.editfinish', { features: [this._draw.get(this._editingFeatureId)] })
      return
    }
    if (mode === 'draw_polygon' || mode === 'draw_line') {
      this._draw.changeMode('disabled')
    }
  }

  cancel () {
    this._mapProvider.undoStack?.clear()
    this._draw.trash()
    this._draw.changeMode('disabled')
  }

  undo () {
    this._map.fire('draw.undo')
  }

  deleteVertex () {
    // TODO: wire delete-vertex into the ML edit mode (currently keyboard-only in draw-ml)
  }

  get (id) { return this._draw.get(id) }
  add (feature) { return this._draw.add(feature) }
  delete (id) { this._draw.delete(id) }
  deleteAll () { this._draw.deleteAll() }

  setSnapEnabled (bool) {
    this._mapProvider.snapEnabled = bool
    const snap = getSnapInstance(this._map)
    if (snap?.setSnapStatus) { snap.setSnapStatus(bool) }
    if (!bool && snap) {
      clearSnapState(snap)
      if (this._map.getLayer('snap-helper-circle')) {
        this._map.setLayoutProperty('snap-helper-circle', 'visibility', 'none')
      }
    }
  }

  setSnapLayers (layers) {
    const snap = getSnapInstance(this._map)
    if (snap?.setSnapLayers) {
      snap.setSnapLayers(layers)
    } else if (layers) {
      this._map._pendingSnapLayers = layers
    }
  }

  isSnapEnabled () { return this._mapProvider.snapEnabled === true }

  setFeatureProperty (id, property, value) { this._draw.setFeatureProperty(id, property, value) }

  on (type, handler) { this._bus.on(type, handler) }
  off (type, handler) { this._bus.off(type, handler) }

  _handleModeChange (e) {
    const DRAW_MODES = new Set(['draw_polygon', 'draw_line'])
    if (!DRAW_MODES.has(e.mode)) {
      clearSnapIndicator(getSnapInstance(this._map), this._map)
    }
  }

  // Keeps draw layers on top after MapLibre style reloads
  _handleStyleData () {
    const layers = this._map.getStyle().layers || []
    if (!layers.length || layers[layers.length - 1].source?.startsWith('mapbox-gl-draw')) {
      return
    }
    layers
      .filter(l => l.source?.startsWith('mapbox-gl-draw'))
      .forEach(l => this._map.moveLayer(l.id))
  }

  remove () {
    this._map.off('draw.create', this._mapHandlers.create)
    this._map.off('draw.editfinish', this._mapHandlers.editfinish)
    this._map.off('draw.cancel', this._mapHandlers.cancel)
    this._map.off('draw.vertexselection', this._mapHandlers.vertexselection)
    this._map.off('draw.vertexchange', this._mapHandlers.vertexchange)
    this._map.off('draw.undochange', this._mapHandlers.undochange)
    this._map.off('draw.update', this._mapHandlers.update)
    this._map.off('draw.geometrychange', this._mapHandlers.geometrychange)
    this._map.off('draw.modechange', this._mapHandlers.modechange)
    this._map.off('styledata', this._mapHandlers.styledata)
    this._cleanupDraw()
  }
}
