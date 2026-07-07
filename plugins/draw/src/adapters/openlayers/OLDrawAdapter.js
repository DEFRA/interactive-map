import { createOLDraw } from './olDraw.js'

/**
 * Draw adapter for OpenLayers.
 *
 * Wraps OLDrawManager (via createOLDraw) and exposes the shared adapter interface
 * consumed by events.js, DrawInit, and the api entry points.
 *
 * OLDrawManager already exposes on/off/emit, changeMode, done/cancel/undo/deleteVertex,
 * get/add/delete/deleteAll, and setInterfaceType. This adapter adds the snap methods
 * and undo-stack clearing (OL manages its own undo stack on the manager).
 *
 * Adapter interface (also implemented by MaplibreDrawAdapter):
 *   changeMode(name, options)
 *   getMode()
 *   setInterfaceType(type)
 *   done() / cancel() / undo() / deleteVertex()
 *   get(id) / add(feature) / delete(id) / deleteAll()
 *   setSnapEnabled(bool) / setSnapLayers(layers) / isSnapEnabled()
 *   on(event, handler) / off(event, handler)
 *   remove()
 */
export class OLDrawAdapter {
  _snapEnabled = false

  constructor (mapProvider, options) {
    const { remove } = createOLDraw({
      mapProvider,
      events: options.events,
      eventBus: options.eventBus,
      pluginConfig: { snapLayers: options.snapLayers },
      mapStyle: options.mapStyle
    })
    this._cleanupOLDraw = remove
    // createOLDraw sets mapProvider.draw = manager; save it before DrawInit overwrites it
    this._manager = mapProvider.draw
    this._mapProvider = mapProvider
  }

  changeMode (name, options = {}) {
    // Inject OL-specific options that the unified api doesn't supply
    const opts = { ...options, mapProvider: this._mapProvider }
    if (name === 'draw_polygon') { opts.geometryType = 'Polygon' }
    if (name === 'draw_line') { opts.geometryType = 'LineString' }
    return this._manager.changeMode(name, opts)
  }

  getMode () { return this._manager.getMode() }

  setInterfaceType (type) { this._manager.setInterfaceType(type) }

  done () {
    this._manager.undoStack.clear()
    this._manager.done()
  }

  cancel () {
    this._manager.undoStack.clear()
    this._manager.cancel()
  }

  undo () { this._manager.undo() }
  deleteVertex () { this._manager.deleteVertex() }

  // Record the current geometry validity so the draw mode can block finish gestures
  // (double-click / click-to-close) while the in-progress shape is invalid.
  setGeometryValid (valid) { this._manager._geometryValid = valid }

  // The api entry points assign the active user validator to the adapter; store it
  // on the manager so the draw mode can veto placements synchronously.
  set _geometryValidator (fn) { this._manager._geometryValidator = fn }
  get _geometryValidator () { return this._manager._geometryValidator }

  // Show/hide the dashed invalid stroke on the active sketch or edit feature.
  setInvalid (invalid) { this._manager.setInvalid(invalid) }

  get (id) { return this._manager.get(id) }
  add (feature) { return this._manager.add(feature) }
  delete (id) { return this._manager.delete(id) }
  deleteAll () { return this._manager.deleteAll() }

  setSnapEnabled (bool) {
    this._snapEnabled = bool
    this._manager.snap?.setActive(bool)
  }

  setSnapLayers (layers) {
    this._manager.snap?.setSnapLayers(layers)
  }

  isSnapEnabled () { return this._snapEnabled }

  setFeatureProperty () { /* not implemented for OL */ }

  on (type, handler) { this._manager.on(type, handler) }
  off (type, handler) { this._manager.off(type, handler) }

  remove () {
    this._cleanupOLDraw()
  }
}
