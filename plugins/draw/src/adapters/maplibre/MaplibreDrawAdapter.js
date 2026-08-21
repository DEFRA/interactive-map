import { createMapboxDraw } from './mapboxDraw.js'
import { getSnapInstance, clearSnapState, clearSnapIndicator } from './utils/snapHelpers.js'
import { createEventBus } from '../../utils/eventBus.js'
import { MAPBOX_DRAW_EVENTS, CUSTOM_DRAW_EVENTS, STYLE_DATA_EVENT } from './drawEvents.js'
import { ADAPTER_EVENTS } from '../../adapterEvents.js'
import { createLiveStroke } from '../../validation/liveStroke.js'
import { createLiveDrawChecks } from '../../validation/liveDrawChecks.js'
import { resolvePointSymbol, hasSymbolStyle } from './pointSymbolImages.js'

const polygonFeature = (coordinates) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates } })
const lineFeature = (coordinates) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates } })
const pointFeature = (coordinates) => ({ type: 'Feature', geometry: { type: 'Point', coordinates } })

// The displayed feature + placed-vertex count for the live stroke check. MapLibre's
// fire() copies the payload onto an Event whose `type` is the event name, so the
// geometry type is clobbered — it comes from the draw mode, or (in edit, where the
// mode covers both shapes) from the coordinate nesting: a polygon's coordinates are
// rings (one level deeper than a line's). Draw-mode coordinates carry a trailing
// rubber-band point; edit-mode coordinates are all committed vertices.
export const displayedShape = (mode, coordinates) => {
  if (mode === 'draw_polygon') {
    return { feature: polygonFeature(coordinates), numVertices: (coordinates[0]?.length ?? 1) - 1 }
  }
  if (mode === 'draw_line') {
    return { feature: lineFeature(coordinates), numVertices: (coordinates?.length ?? 1) - 1 }
  }
  if (mode === 'edit_vertex') {
    // Read the outer ring once — Array.isArray(ring?.[0]) already proves `ring` itself is
    // non-nullish whenever it's true, so the polygon branch can use it directly with no
    // second optional-chaining/fallback (which `coordinates[0]` re-read a second time,
    // unreachably, used to need).
    const ring = coordinates[0]
    return Array.isArray(ring?.[0])
      ? { feature: polygonFeature(coordinates), numVertices: ring.length }
      : { feature: lineFeature(coordinates), numVertices: coordinates?.length ?? 0 }
  }
  if (mode === 'edit_point') {
    // A Point's coordinates are already flat ([lng, lat]) — no ring/segment shape to read.
    return { feature: pointFeature(coordinates), numVertices: 1 }
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
 *   nudgeSelectedVertex(dx, dy, isLargeStep)
 *   get(id) / add(feature) / setStyle(id, properties) / delete(id) / deleteAll()
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
    // Assigned once per feature, on creation only — see styles.js's SORT_KEY_PROP. Drives
    // fill/line/symbol-sort-key so a later-drawn feature reliably paints above an earlier one
    // within the same shared layer, instead of the order being incidental to mapbox-gl-draw's
    // internal cold/hot bucket placement.
    this._sortKeyCounter = 0

    const { draw, remove } = createMapboxDraw({
      mapStyle: options.mapStyle,
      mapProvider,
      events: options.events,
      eventBus: options.eventBus,
      snapLayers: options.snapLayers,
      pluginConfig: options.pluginConfig ?? {}
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
        const mode = this._draw.getMode()
        if (mode === 'edit_vertex' || mode === 'edit_point') {
          this._bus.emit(ADAPTER_EVENTS.VALIDITY_CHANGE, { valid: !invalid, reason })
        }
      }
    })

    // Draw-mode-only: computes both the stroke/Done verdict and the Add-point
    // verdict from a SINGLE throttled call to the user's callback per rubber-band
    // move (see liveDrawChecks.js for why), and is flip-guarded itself. The
    // stroke verdict still routes through _liveStroke.set() — that instance is
    // also driven independently by edit mode and must stay the single source of
    // truth for the rendered stroke across mode switches. The Add-point verdict
    // has no such cross-mode instance to stay in sync with, so it emits directly.
    this._liveDrawChecks = createLiveDrawChecks({
      onStrokeChange: (invalid, reason) => this._liveStroke.set(invalid, reason),
      onPlaceChange: (vetoed, reason) => this._bus.emit(ADAPTER_EVENTS.CAN_PLACE_CHANGE, { canPlace: !vetoed, reason })
    })

    // Normalise ML map events → the shared adapter event contract (adapterEvents.js).
    // The OL adapter emits the same contract directly from OLDrawManager.
    this._mapHandlers = {
      create: (e) => {
        const feature = e.features[0]
        // Every draw mode's own 'draw.create' listener (registered later, at that mode's
        // onSetup, so it runs after this one in the same synchronous dispatch) re-ids a
        // freshly-drawn feature to its caller-requested id via a delete+re-add (see
        // drawPointMode.js's onCreate / drawMode/clickHandlers.js's reidCreatedFeature) —
        // mutating this SAME `feature` object's `id` in place. Deferring a tick lets that
        // re-id finish first, so `feature.id` is already final by the time this runs, and
        // setFeatureProperty targets the feature that's actually still in the store.
        setTimeout(() => {
          this._draw.setFeatureProperty(feature.id, 'sortKey', this._nextSortKey())
          this._bus.emit(ADAPTER_EVENTS.CREATE, this._draw.get(feature.id))
        }, 0)
      },
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
    if (name === 'edit_vertex' || name === 'edit_point') {
      this._editingFeatureId = options.featureId ?? null
    }
    // A fresh draw always starts with a solid stroke and a placeable crosshair;
    // the live checks own both from here.
    if (name === 'draw_polygon' || name === 'draw_line') {
      this._liveStroke.set(false)
      this._liveDrawChecks.reset()
    }
    // draw_point has no direct dependency on symbolRegistry/mapProvider — the resolver is
    // injected here so the mode only ever calls state.resolvePointSymbol(...) and stays
    // decoupled from how a symbol image actually gets resolved/registered.
    if (name === 'draw_point') {
      options = { ...options, resolvePointSymbol: (featureId, properties) => this._resolvePointSymbol(featureId, properties) }
    }
    this._draw.changeMode(name, options)
    // The underlying mapbox-gl-draw control's public changeMode API is silent by
    // default (it never fires 'draw.modechange'), so every mode change requested
    // through this adapter must drive the same cleanup manually.
    this._handleModeChange({ mode: name })
  }

  // Injected into draw_point's changeMode options as state.resolvePointSymbol — resolves and
  // registers the feature's symbol-config icon, then writes the resolved image id/anchor back
  // onto the feature so the data-driven point-symbol layer (styles.js) can render it.
  _resolvePointSymbol (featureId, properties) {
    return resolvePointSymbol({ draw: this._draw, mapProvider: this._mapProvider, map: this._map, featureId, properties })
  }

  // Live invalid-stroke driver: called on every rubber-band move (draw) and vertex
  // drag / nudge (edit) with the displayed feature. Edit mode has no Add-point
  // gate, so it goes straight through the live-stroke controller as before. Draw
  // mode routes through _liveDrawChecks instead, which computes both the stroke
  // and Add-point verdicts from one throttled user-callback call (see
  // liveDrawChecks.js).
  _updateLiveStroke (e) {
    if (!e?.coordinates) { return }
    const mode = this._draw.getMode()
    const shape = displayedShape(mode, e.coordinates)
    if (!shape) { return }
    if (mode === 'draw_polygon' || mode === 'draw_line') {
      this._liveDrawChecks.update({ feature: shape.feature, numVertices: shape.numVertices, context: { mode }, onGeometryChange: this._geometryValidator })
    } else {
      this._liveStroke.update({ ...shape, context: { mode }, onGeometryChange: this._geometryValidator })
    }
  }

  getMode () { return this._draw.getMode() }

  setInterfaceType (type) {
    this._map.fire(CUSTOM_DRAW_EVENTS.INTERFACE_TYPE_CHANGE, { interfaceType: type })
  }

  done () {
    this._mapProvider.undoStack?.clear()
    const mode = this._draw.getMode()
    if ((mode === 'edit_vertex' || mode === 'edit_point') && this._editingFeatureId) {
      // Leaving edit_vertex/edit_point here — hide immediately rather than waiting on the
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
    const mode = this._draw.getMode()
    // trash() only belongs to an in-progress, never-committed draw — it deletes
    // whatever's selected. For edit_vertex, events.js's handleCancel has already
    // restored the original feature via draw.add() before this runs; trash()
    // here would instead run mapbox-gl-draw's direct_select onTrash on the
    // mode's own live state (removing the selected vertex, or — if the
    // in-progress edit happened to leave the shape invalid — deleting the
    // entire feature), silently discarding the just-restored original.
    if (mode === 'draw_polygon' || mode === 'draw_line') {
      this._draw.trash()
    }
    this._draw.changeMode('disabled')
    this._handleModeChange({ mode: 'disabled' })
  }

  undo () {
    this._map.fire(CUSTOM_DRAW_EVENTS.UNDO)
  }

  // MoveControls' D-pad, routed here via mapProvider.activeMoveTarget (see
  // events.js) once a vertex is selected. Bridged into the running edit mode the
  // same way setInterfaceType is, since the adapter has no direct reference to the
  // mode's live state.
  nudgeSelectedVertex (dx, dy, isLargeStep) {
    this._map.fire(CUSTOM_DRAW_EVENTS.NUDGE_VERTEX, { dx, dy, isLargeStep })
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

  _nextSortKey () {
    this._sortKeyCounter += 1
    return this._sortKeyCounter
  }

  // A directly-added Point (e.g. api/addFeature.js) skips draw_point's own icon-resolving
  // drawend handler, so it must be resolved here instead — with no fallback, styles.js's
  // point-symbol layer would otherwise render nothing at all.
  add (feature) {
    // Only a genuinely new feature gets a fresh sort key — setStyle() re-adds an existing one
    // (via a shallow properties spread) to re-render it, and must not bump it back to the front.
    const properties = feature.properties?.sortKey == null
      ? { ...feature.properties, sortKey: this._nextSortKey() }
      : feature.properties
    const withSortKey = { ...feature, properties }
    const ids = this._draw.add(withSortKey)
    if (withSortKey.geometry?.type === 'Point' && hasSymbolStyle(properties)) {
      this._resolvePointSymbol(ids[0], properties)
    }
    return ids
  }

  // Patches an existing feature's style properties (stroke/fill/strokeWidth or symbol-family
  // keys) and re-renders — routed through add() itself so a Point's icon gets re-resolved the
  // same way a directly-added one does, for free.
  setStyle (id, properties) {
    const feature = this._draw.get(id)
    if (!feature) {
      return
    }
    this.add({ ...feature, properties: { ...feature.properties, ...properties } })
  }

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
    const DRAW_MODES = new Set(['draw_polygon', 'draw_line', 'draw_point', 'edit_vertex', 'edit_point'])
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
    this._liveDrawChecks.destroy()
    this._cleanupDraw()
  }
}
