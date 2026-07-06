import { createMapboxDraw } from './mapboxDraw.js'
import { getSnapInstance, clearSnapState, clearSnapIndicator } from './utils/snapHelpers.js'
import { createEventBus } from '../../utils/eventBus.js'
import { MAPBOX_DRAW_EVENTS, CUSTOM_DRAW_EVENTS, STYLE_DATA_EVENT } from './drawEvents.js'
import { ADAPTER_EVENTS } from '../../adapterEvents.js'

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

    // Normalise ML map events → the shared adapter event contract (adapterEvents.js).
    // The OL adapter emits the same contract directly from OLDrawManager.
    this._mapHandlers = {
      create: (e) => this._bus.emit(ADAPTER_EVENTS.CREATE, e.features[0]),
      editfinish: (e) => this._bus.emit(ADAPTER_EVENTS.EDIT_FINISH, e.features[0]),
      cancel: () => this._bus.emit(ADAPTER_EVENTS.CANCEL),
      // Normalise typo: the ML modes fire numVertecies, the contract uses numVertices
      vertexselection: (e) => this._bus.emit(ADAPTER_EVENTS.VERTEX_SELECTION, { ...e, numVertices: e.numVertecies }),
      vertexchange: (e) => this._bus.emit(ADAPTER_EVENTS.VERTEX_CHANGE, { ...e, numVertices: e.numVertecies }),
      undochange: (e) => this._bus.emit(ADAPTER_EVENTS.UNDO_CHANGE, e.length),
      update: (e) => this._bus.emit(ADAPTER_EVENTS.UPDATE, e.features[0]),
      geometrychange: (e) => this._bus.emit(ADAPTER_EVENTS.GEOMETRY_CHANGE, e),
      modechange: (e) => this._handleModeChange(e),
      styledata: () => this._handleStyleData()
    }

    this._map.on(MAPBOX_DRAW_EVENTS.CREATE, this._mapHandlers.create)
    this._map.on(CUSTOM_DRAW_EVENTS.EDIT_FINISH, this._mapHandlers.editfinish)
    this._map.on(CUSTOM_DRAW_EVENTS.CANCEL, this._mapHandlers.cancel)
    this._map.on(CUSTOM_DRAW_EVENTS.VERTEX_SELECTION, this._mapHandlers.vertexselection)
    this._map.on(CUSTOM_DRAW_EVENTS.VERTEX_CHANGE, this._mapHandlers.vertexchange)
    this._map.on(CUSTOM_DRAW_EVENTS.UNDO_CHANGE, this._mapHandlers.undochange)
    this._map.on(MAPBOX_DRAW_EVENTS.UPDATE, this._mapHandlers.update)
    this._map.on(CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE, this._mapHandlers.geometrychange)
    this._map.on(MAPBOX_DRAW_EVENTS.MODE_CHANGE, this._mapHandlers.modechange)
    this._map.on(STYLE_DATA_EVENT, this._mapHandlers.styledata)
  }

  changeMode (name, options = {}) {
    if (name === 'edit_vertex') {
      this._editingFeatureId = options.featureId ?? null
    }
    this._draw.changeMode(name, options)
  }

  getMode () { return this._draw.getMode() }

  setInterfaceType (type) {
    this._map.fire(CUSTOM_DRAW_EVENTS.INTERFACE_TYPE_CHANGE, { interfaceType: type })
  }

  done () {
    this._mapProvider.undoStack?.clear()
    const mode = this._draw.getMode()
    if (mode === 'edit_vertex' && this._editingFeatureId) {
      this._map.fire(CUSTOM_DRAW_EVENTS.EDIT_FINISH, { features: [this._draw.get(this._editingFeatureId)] })
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
    this._map.fire(CUSTOM_DRAW_EVENTS.UNDO)
  }

  deleteVertex () {
    // Intentionally a no-op on MapLibre. The shared events layer calls draw.deleteVertex()
    // from the delete-point button, but the ML edit mode already handles deletion itself:
    // via the keyboard (Backspace/Delete) and its own window-click listener matching
    // deleteVertexButtonId (see editVertexMode.onButtonClick). Deleting here too would
    // double-delete. The OL adapter implements this for real; here it only satisfies the
    // shared adapter interface.
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
    } else {
      // No action
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
    this._map.off(MAPBOX_DRAW_EVENTS.CREATE, this._mapHandlers.create)
    this._map.off(CUSTOM_DRAW_EVENTS.EDIT_FINISH, this._mapHandlers.editfinish)
    this._map.off(CUSTOM_DRAW_EVENTS.CANCEL, this._mapHandlers.cancel)
    this._map.off(CUSTOM_DRAW_EVENTS.VERTEX_SELECTION, this._mapHandlers.vertexselection)
    this._map.off(CUSTOM_DRAW_EVENTS.VERTEX_CHANGE, this._mapHandlers.vertexchange)
    this._map.off(CUSTOM_DRAW_EVENTS.UNDO_CHANGE, this._mapHandlers.undochange)
    this._map.off(MAPBOX_DRAW_EVENTS.UPDATE, this._mapHandlers.update)
    this._map.off(CUSTOM_DRAW_EVENTS.GEOMETRY_CHANGE, this._mapHandlers.geometrychange)
    this._map.off(MAPBOX_DRAW_EVENTS.MODE_CHANGE, this._mapHandlers.modechange)
    this._map.off(STYLE_DATA_EVENT, this._mapHandlers.styledata)
    this._cleanupDraw()
  }
}
