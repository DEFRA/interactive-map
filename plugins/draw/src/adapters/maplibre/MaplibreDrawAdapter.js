import { createMapboxDraw } from './mapboxDraw.js'
import { getSnapInstance, clearSnapState, clearSnapIndicator } from './utils/snapHelpers.js'
import { createEventBus } from '../../utils/eventBus.js'
import { MAPBOX_DRAW_EVENTS, CUSTOM_DRAW_EVENTS, STYLE_DATA_EVENT } from './drawEvents.js'
import { ADAPTER_EVENTS } from '../../adapterEvents.js'
import { createLiveStroke } from '../../validation/liveStroke.js'
import { validatePlacement } from '../../validation/validateGeometry.js'

const polygonFeature = (coordinates) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates } })
const lineFeature = (coordinates) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates } })

// The displayed feature + placed-vertex count for the live stroke check. MapLibre's
// fire() copies the payload onto an Event whose `type` is the event name, so the
// geometry type is clobbered — it comes from the draw mode, or (in edit, where the
// mode covers both shapes) from the coordinate nesting: a polygon's coordinates are
// rings (one level deeper than a line's). Draw-mode coordinates carry a trailing
// rubber-band point; edit-mode coordinates are all committed vertices.
export const displayedShape = (mode, coordinates) => {
  if (mode === 'draw_polygon') {
    return { feature: polygonFeature(coordinates), placedCount: (coordinates[0]?.length ?? 1) - 1 }
  }
  if (mode === 'draw_line') {
    return { feature: lineFeature(coordinates), placedCount: (coordinates?.length ?? 1) - 1 }
  }
  if (mode === 'edit_vertex') {
    return Array.isArray(coordinates[0]?.[0])
      ? { feature: polygonFeature(coordinates), placedCount: coordinates[0]?.length ?? 0 }
      : { feature: lineFeature(coordinates), placedCount: coordinates?.length ?? 0 }
  }
  return null
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
 *   setFeatureProperty(id, property, value) / setDrawingPreviewProperty(property, value)
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

    // Single owner of the dashed-stroke state: live rubber-band / drag moves feed
    // update() (default rules sync, user callback throttled) and committed verdicts
    // (events.js) land via setInvalid → set(), so the cached state always mirrors
    // the rendered layers. onChange does the actual layer toggle; in edit mode the
    // displayed shape is exactly what Done finishes, so validity flips also gate
    // the Done button (events.js dispatches them).
    this._liveStroke = createLiveStroke({
      onChange: (invalid, reason) => {
        this._applyStrokeInvalid(invalid)
        if (this._draw.getMode() === 'edit_vertex') {
          this._bus.emit(ADAPTER_EVENTS.VALIDITY_CHANGE, { valid: !invalid, reason })
        }
      }
    })

    // Live Add-point gate: would placing a vertex at the crosshair be vetoed?
    // Same throttling as the stroke, but evaluated with the placement (hard) rules
    // so the button tracks exactly what a tap would do.
    this._livePlacement = createLiveStroke({
      validate: validatePlacement,
      onChange: (vetoed, reason) => this._bus.emit(ADAPTER_EVENTS.CAN_PLACE_CHANGE, { canPlace: !vetoed, reason })
    })

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
      geometrychange: (e) => {
        // Phase-less events are rubber-band moves carrying the displayed feature
        // (placed vertices + cursor) — they drive the live invalid stroke, and are
        // cached for setDrawingPreviewProperty (the in-progress feature has no
        // stable id yet — only assigned once drawing actually finishes — so it
        // can't be targeted via setFeatureProperty).
        if (!e?.phase) {
          this._updateLiveStroke(e)
          this._currentDrawEvent = e
        }
        this._bus.emit(ADAPTER_EVENTS.GEOMETRY_CHANGE, e)
      },
      placementblocked: (e) => this._bus.emit(ADAPTER_EVENTS.PLACEMENT_BLOCKED, e),
      interfacetypechange: (e) => this._bus.emit(ADAPTER_EVENTS.INTERFACE_TYPE_CHANGE, { interfaceType: e.interfaceType }),
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
    this._map.on(CUSTOM_DRAW_EVENTS.PLACEMENT_BLOCKED, this._mapHandlers.placementblocked)
    this._map.on(CUSTOM_DRAW_EVENTS.INTERFACE_TYPE_CHANGE, this._mapHandlers.interfacetypechange)
    this._map.on(MAPBOX_DRAW_EVENTS.MODE_CHANGE, this._mapHandlers.modechange)
    this._map.on(STYLE_DATA_EVENT, this._mapHandlers.styledata)
  }

  changeMode (name, options = {}) {
    if (name === 'edit_vertex') {
      this._editingFeatureId = options.featureId ?? null
    }
    // A fresh draw always starts with a solid stroke and a placeable crosshair;
    // the live checks own both from here.
    if (name === 'draw_polygon' || name === 'draw_line') {
      this._liveStroke.set(false)
      this._livePlacement.set(false)
    }
    this._draw.changeMode(name, options)
    // The underlying mapbox-gl-draw control's public changeMode API is silent by
    // default (it never fires 'draw.modechange'), so every mode change requested
    // through this adapter must drive the same cleanup manually.
    this._handleModeChange({ mode: name })
  }

  // Live invalid-stroke driver: called on every rubber-band move (draw) and vertex
  // drag / nudge (edit) with the displayed feature. Delegates to the shared
  // live-stroke controller, which runs the default rules synchronously and the user
  // callback throttled, toggling the dashed stroke only when validity flips. While
  // drawing, the same displayed geometry (placed vertices + crosshair candidate)
  // also feeds the Add-point placement gate.
  _updateLiveStroke (e) {
    if (!e?.coordinates) { return }
    const mode = this._draw.getMode()
    const shape = displayedShape(mode, e.coordinates)
    if (!shape) { return }
    this._liveStroke.update({ ...shape, context: { mode }, onGeometryChange: this._geometryValidator })
    if (mode === 'draw_polygon' || mode === 'draw_line') {
      this._livePlacement.update({
        feature: shape.feature,
        context: { mode, vertexIndex: shape.placedCount },
        onGeometryChange: this._geometryValidator
      })
    }
  }

  getMode () { return this._draw.getMode() }

  setInterfaceType (type) {
    this._map.fire(CUSTOM_DRAW_EVENTS.INTERFACE_TYPE_CHANGE, { interfaceType: type })
  }

  done () {
    this._mapProvider.undoStack?.clear()
    const mode = this._draw.getMode()
    if (mode === 'edit_vertex' && this._editingFeatureId) {
      // Leaving edit_vertex here — hide immediately rather than waiting on the
      // async disable() the EDIT_FINISH handler fires later (see changeMode()).
      this._handleModeChange({ mode: 'disabled' })
      this._map.fire(CUSTOM_DRAW_EVENTS.EDIT_FINISH, { features: [this._draw.get(this._editingFeatureId)] })
      return
    }
    if (mode === 'draw_polygon' || mode === 'draw_line') {
      this._draw.changeMode('disabled')
      this._handleModeChange({ mode: 'disabled' })
    }
  }

  cancel () {
    this._mapProvider.undoStack?.clear()
    this._draw.trash()
    this._draw.changeMode('disabled')
    this._handleModeChange({ mode: 'disabled' })
  }

  undo () {
    this._map.fire(CUSTOM_DRAW_EVENTS.UNDO)
  }

  // Record the current geometry validity so the draw mode can block finish gestures
  // (double-click / click-to-close) while the in-progress shape is invalid.
  setGeometryValid (valid) {
    this._map._drawGeometryValid = valid
  }

  // The api entry points assign the active user validator to the adapter; store it
  // on the map (like _drawGeometryValid) so modes can veto placements synchronously.
  set _geometryValidator (fn) { this._map._drawGeometryValidator = fn }
  get _geometryValidator () { return this._map._drawGeometryValidator }

  // Committed-verdict write (events.js, edit mode): routed through the live-stroke
  // controller so its cached state stays in sync with the rendered layers.
  setInvalid (invalid) {
    this._liveStroke.set(invalid)
  }

  // Toggle the active shape's stroke between solid (valid) and dashed (invalid) by
  // swapping which of the two overlaid stroke layers is visible; the fill is hidden
  // while invalid so the shape reads as an outline only. Only the live-stroke
  // controller calls this — everything else goes through setInvalid.
  _applyStrokeInvalid (invalid) {
    this._setLayerVisibility('stroke-active', !invalid)
    this._setLayerVisibility('stroke-active-invalid', invalid)
    this._setLayerVisibility('fill-active', !invalid)
  }

  _setLayerVisibility (id, visible) {
    ['hot', 'cold'].forEach((suffix) => {
      const layerId = `${id}.${suffix}`
      if (this._map.getLayer(layerId)) {
        this._map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
      }
    })
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

  isSnapEnabled () {
    return this._mapProvider.snapEnabled === true
  }

  setFeatureProperty (id, property, value) {
    this._draw.setFeatureProperty(id, property, value)
  }

  // Tag the feature currently being drawn (rubber-band, not yet created — so it
  // has no stable id to target via setFeatureProperty) with a property, and
  // re-render so the change is visible immediately. Used for live preview styling
  // while drawing, e.g. split's valid/invalid line colour. A no-op once nothing
  // has been drawn yet this session, or outside draw_polygon/draw_line.
  setDrawingPreviewProperty (property, value) {
    const e = this._currentDrawEvent
    if (e?.properties) {
      e.properties[property] = value
    }
    e?.ctx?.store?.render()
  }

  on (type, handler) {
    this._bus.on(type, handler)
  }

  off (type, handler) {
    this._bus.off(type, handler)
  }

  _handleModeChange (e) {
    const DRAW_MODES = new Set(['draw_polygon', 'draw_line', 'edit_vertex'])
    if (!DRAW_MODES.has(e.mode)) {
      clearSnapIndicator(getSnapInstance(this._map), this._map)
    }
  }

  // Keeps draw layers on top after MapLibre style reloads
  _handleStyleData () {
    // A style reload re-adds the draw layers with their spec-default visibility
    // (solid stroke shown, dashed hidden) — re-assert the cached stroke state so
    // an invalid shape stays dashed across the reload.
    this._liveStroke.refresh()
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
    this._map.off(CUSTOM_DRAW_EVENTS.PLACEMENT_BLOCKED, this._mapHandlers.placementblocked)
    this._map.off(CUSTOM_DRAW_EVENTS.INTERFACE_TYPE_CHANGE, this._mapHandlers.interfacetypechange)
    this._map.off(MAPBOX_DRAW_EVENTS.MODE_CHANGE, this._mapHandlers.modechange)
    this._map.off(STYLE_DATA_EVENT, this._mapHandlers.styledata)
    this._liveStroke.destroy()
    this._livePlacement.destroy()
    this._cleanupDraw()
  }
}
