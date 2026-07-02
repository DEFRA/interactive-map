import VectorLayer from 'ol/layer/Vector.js'
import { createFeatureStore } from './featureStore.js'
import { createUndoStack } from '../../../utils/undoStack.js'
import { createStyles } from './styles.js'
import { resolveColors } from '../utils/resolveColors.js'
import { createSnapManager } from '../snap/snapManager.js'
import { createDrawMode } from '../draw/DrawMode.js'
import { createEditMode } from '../edit/EditMode.js'
import { TOLERANCES } from '../defaults.js'

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
  constructor (map, pluginConfig = {}) {
    this._map = map
    this._pluginConfig = pluginConfig
    this._mode = 'disabled'
    this._modeInstance = null
    this._listeners = new Map()

    this.store = createFeatureStore()
    this.undoStack = createUndoStack((length) => this.emit('undochange', length))

    this.colors = resolveColors(null, pluginConfig)
    this.styles = createStyles(this.colors)
    this.snap = createSnapManager(map, pluginConfig.snapLayers ?? null, this.colors, pluginConfig.snapRadius ?? TOLERANCES.snapRadius)

    this._layer = new VectorLayer({
      source: this.store.source,
      style: this.styles.createFeatureStyle(),
      zIndex: 100
    })
    this._layer.set('layerId', 'draw')
    map.addLayer(this._layer)
  }

  // --- Color / style updates ---

  setMapStyle (mapStyle) {
    this.colors = resolveColors(mapStyle, this._pluginConfig)
    this.styles = createStyles(this.colors)
    this._layer.setStyle(this.styles.createFeatureStyle())
    this.store.source.changed()
    this.snap?.updateColors(this.colors)
    this.emit('styleschanged', this.styles)
  }

  // --- Internal event bus ---

  on (type, handler) {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set())
    }
    this._listeners.get(type).add(handler)
  }

  off (type, handler) {
    this._listeners.get(type)?.delete(handler)
  }

  emit (type, detail) {
    const handlers = this._listeners.get(type)
    if (handlers) { [...handlers].forEach(h => h(detail)) }
  }

  // --- Mode machine ---

  async changeMode (modeName, options = {}) {
    this._modeInstance?.destroy()
    this._modeInstance = null
    this._mode = modeName

    const isDrawMode = modeName === 'draw_polygon' || modeName === 'draw_line' || modeName === 'edit_vertex'
    this.snap?.setIndicatorActive(isDrawMode)

    const modeOptions = { ...options, snap: this.snap }

    if (modeName === 'draw_polygon' || modeName === 'draw_line') {
      this._modeInstance = createDrawMode({ map: this._map, manager: this, options: modeOptions })
    } else if (modeName === 'edit_vertex') {
      this._modeInstance = createEditMode({ map: this._map, manager: this, options: modeOptions })
    } else {
      // disabled — no mode instance needed
    }
    // Reattach snap interaction after mode's interactions are added so it
    // processes pointermove first (OL: last-added interaction = first to handle events).
    this.snap?.reattach()
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

  setInterfaceType (type) {
    this._modeInstance?.setInterfaceType?.(type)
  }

  // --- Feature store delegation ---

  get (id) {
    return this.store.get(id)
  }

  add (geojsonFeature) {
    return this.store.add(geojsonFeature)
  }

  delete (id) {
    return this.store.remove(id)
  }

  deleteAll () {
    return this.store.clear()
  }

  // --- Cleanup ---

  remove () {
    this._modeInstance?.destroy()
    this._modeInstance = null
    this.snap?.destroy()
    this.snap = null
    this.store.clear()
    this._map.removeLayer(this._layer)
    this._listeners.clear()
  }
}
