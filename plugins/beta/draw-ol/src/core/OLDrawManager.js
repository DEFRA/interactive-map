import VectorLayer from 'ol/layer/Vector.js'
import { createFeatureStore } from './featureStore.js'
import { createUndoStack } from './undoStack.js'
import { createFeatureStyle } from './styles.js'

/**
 * Mode machine for the OL draw plugin.
 *
 * Owns the VectorSource/Layer, undo stack, and current mode instance.
 * Exposes a minimal on/off/emit event bus for internal plugin communication
 * (separate from the public eventBus used for consumer-facing events).
 *
 * Consumer-facing events are always emitted via eventBus by events.js after
 * listening to the manager's internal events.
 */
export class OLDrawManager {
  constructor (map) {
    this._map = map
    this._mode = 'disabled'
    this._modeInstance = null
    this._listeners = new Map()

    this.store = createFeatureStore()
    this.undoStack = createUndoStack((length) => this.emit('undochange', length))

    this._layer = new VectorLayer({
      source: this.store.source,
      style: createFeatureStyle(),
      zIndex: 100
    })
    map.addLayer(this._layer)
  }

  // --- Internal event bus ---

  on (type, handler) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set())
    this._listeners.get(type).add(handler)
  }

  off (type, handler) {
    this._listeners.get(type)?.delete(handler)
  }

  emit (type, detail) {
    this._listeners.get(type)?.forEach(h => h(detail))
  }

  // --- Mode machine ---

  async changeMode (modeName, options = {}) {
    this._modeInstance?.destroy()
    this._modeInstance = null
    this._mode = modeName

    if (modeName === 'draw_polygon' || modeName === 'draw_line') {
      const { createDrawMode } = await import('../draw/DrawMode.js')
      this._modeInstance = createDrawMode({ map: this._map, manager: this, options })
    } else if (modeName === 'edit_vertex') {
      const { createEditMode } = await import('../edit/EditMode.js')
      this._modeInstance = createEditMode({ map: this._map, manager: this, options })
    }
  }

  getMode () {
    return this._mode
  }

  // --- High-level operations called by events.js ---

  done () {
    this._modeInstance?.done()
  }

  cancel () {
    this._modeInstance?.cancel()
    this.changeMode('disabled')
  }

  undo () {
    this._modeInstance?.undo()
  }

  deleteVertex () {
    this._modeInstance?.deleteVertex()
  }

  // --- Feature store delegation ---

  get (id) { return this.store.get(id) }
  add (geojsonFeature) { return this.store.add(geojsonFeature) }
  delete (id) { return this.store.remove(id) }
  deleteAll () { return this.store.clear() }

  // --- Cleanup ---

  remove () {
    this._modeInstance?.destroy()
    this._modeInstance = null
    this.store.clear()
    this._map.removeLayer(this._layer)
    this._listeners.clear()
  }
}
