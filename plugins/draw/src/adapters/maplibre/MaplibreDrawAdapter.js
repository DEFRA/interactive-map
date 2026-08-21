import { createMapboxDraw } from './mapboxDraw.js'
import { getSnapInstance, clearSnapState, clearSnapIndicator } from './utils/snapHelpers.js'
import { createEventBus } from '../../utils/eventBus.js'
import { MAPBOX_DRAW_EVENTS, CUSTOM_DRAW_EVENTS, STYLE_DATA_EVENT } from './drawEvents.js'
import { ADAPTER_EVENTS } from '../../adapterEvents.js'
import { createLiveStroke } from '../../validation/liveStroke.js'
import { createLiveDrawChecks } from '../../validation/liveDrawChecks.js'
import { resolvePointSymbol, hasSymbolStyle } from './pointSymbolImages.js'
import { createFeatureLayerGroup, removeFeatureLayerGroup, setFeatureLayerGroupData, getSourceId, getFeatureLayerIds } from './featureLayerGroup.js'
import { applyLayerOrder, ensureAnchorLayer, isDrawOwnedLayerId, ANCHOR_ID } from './layerOrder.js'
import {
  pushIfNew, removeFromOrder,
  moveToFront as moveIdToFront, moveToBack as moveIdToBack,
  moveForward as moveIdForward, moveBackward as moveIdBackward
} from '../../utils/orderList.js'
import { resolveColors } from '../../utils/resolveColors.js'

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
 *   moveToFront(id) / moveForward(id) / moveBackward(id) / moveToBack(id) / getOrder()
 *   getCommittedFeatureLayerIds()
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
    this._pluginConfig = options.pluginConfig ?? {}

    // Every committed (not actively being drawn/edited) feature lives in its own dedicated
    // source + layer(s) (featureLayerGroup.js), never mapbox-gl-draw's own store — that's
    // what gives full, deterministic stacking (layerOrder.js), immune to mapbox-gl-draw's
    // incidental hot/cold ordering. _order is back-to-front, same convention as OLDrawManager.
    this._committedFeatures = new Map()
    this._order = []
    this._orderResyncPending = false

    // A point can be committed (its own layer group) or mid-edit (mapbox-gl-draw's own store)
    // by the time an async resolve settles — resolvePointSymbol/refreshAllPointSymbols read and
    // write through this rather than assuming either store. Its methods read this._draw/
    // this._committedFeatures fresh on every call, so it's safe to build before this._draw
    // exists below.
    this._pointStore = this._buildPointStore()

    const { draw, remove } = createMapboxDraw({
      mapStyle: options.mapStyle,
      mapProvider,
      events: options.events,
      eventBus: options.eventBus,
      snapLayers: options.snapLayers,
      pluginConfig: options.pluginConfig ?? {},
      pointStore: this._pointStore
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
      styledata: (e) => this._handleStyleData(e)
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

  _buildPointStore () {
    return {
      get: (id) => this.get(id),
      getAll: () => [...this._committedFeatures.values(), ...this._draw.getAll().features],
      write: (feature) => {
        if (this._committedFeatures.has(feature.id)) {
          this._committedFeatures.set(feature.id, feature)
          setFeatureLayerGroupData({ map: this._map, featureId: feature.id, feature })
        } else {
          this._draw.add(feature)
        }
      }
    }
  }

  // --- Committed features: own layer group, deterministic stacking ---

  _getColors () {
    return resolveColors(this._map._drawCurrentMapStyle, this._pluginConfig)
  }

  // Debounced — a burst of triggers in the same frame (a bulk addFeature reload, or a
  // create immediately followed by its own point-symbol resolve settling) collapses into
  // one resync pass instead of one per trigger. _order itself stays synchronous throughout;
  // only the map actually reflecting it is deferred by at most one frame.
  _scheduleApplyOrder () {
    if (this._orderResyncPending) {
      return
    }
    this._orderResyncPending = true
    requestAnimationFrame(() => {
      this._orderResyncPending = false
      this._applyOrder()
    })
  }

  _applyOrder () {
    applyLayerOrder(this._map, this._order, (id) => this._committedFeatures.get(id)?.geometry?.type)
  }

  // Moves a feature into our own layer system — a fresh interactive creation (events.js,
  // after validation passes), a direct addFeature call, or a feature returning from an edit
  // session (events.js's Cancel-restore and Done both already just call the generic add(),
  // unaware of any of this). Deletes it from mapbox-gl-draw's own store unconditionally (a
  // safe no-op if it was never there) — a committed feature lives in exactly one place, never
  // both, or it would render twice. If its layer group already exists (beginEditFromOwnLayers
  // only ever empties it, never removes it) this refreshes that data instead of recreating it
  // from scratch, which would otherwise throw on the duplicate source.
  commitFeature (feature) {
    this._draw.delete(feature.id)
    this._committedFeatures.set(feature.id, feature)
    pushIfNew(this._order, feature.id)
    // The anchor is otherwise only ever created lazily, via the debounced order resync below —
    // on the very first commit (or first few, in a synchronous burst) it doesn't exist yet,
    // and inserting a layer before a beforeId that doesn't exist throws immediately.
    ensureAnchorLayer(this._map)
    if (this._map.getSource(getSourceId(feature.id))) {
      setFeatureLayerGroupData({ map: this._map, featureId: feature.id, feature })
    } else {
      createFeatureLayerGroup({ map: this._map, feature, mapStyle: this._map._drawCurrentMapStyle, colors: this._getColors(), beforeId: ANCHOR_ID })
    }
    this._scheduleApplyOrder()
  }

  removeCommittedFeature (featureId) {
    const feature = this._committedFeatures.get(featureId)
    if (!feature) {
      return
    }
    removeFeatureLayerGroup({ map: this._map, featureId, geometryType: feature.geometry.type })
    this._committedFeatures.delete(featureId)
    removeFromOrder(this._order, featureId)
  }

  // Begins an edit session for an already-committed feature: no longer committed (get() must
  // read the live, mid-edit copy from mapbox-gl-draw's store instead), its rendered source
  // emptied (genuinely absent from any query/selection/snap while being edited, not just
  // paint-hidden — see featureLayerGroup.js) but its layer group left in place, and handed to
  // mapbox-gl-draw's own store for the live session. Ending the session needs nothing
  // ML-specific — events.js's existing Done/Cancel paths already just call the generic add().
  beginEditFromOwnLayers (featureId) {
    const feature = this._committedFeatures.get(featureId)
    if (!feature) {
      return false
    }
    this._committedFeatures.delete(featureId)
    setFeatureLayerGroupData({ map: this._map, featureId })
    this._draw.add(feature)
    return true
  }

  getOrder () {
    return [...this._order]
  }

  // Every concrete draw-{featureId}-* layer id currently on the map — interactPlugin's 'draw'
  // config entry is a logical wildcard, not a real layer, so anything that needs to actually
  // query or look up real layers (hover-cursor filtering, highlight rendering) resolves it
  // through here rather than assuming a literal 'draw' layer exists.
  getCommittedFeatureLayerIds () {
    const ids = []
    this._committedFeatures.forEach((feature, featureId) => {
      ids.push(...getFeatureLayerIds(featureId, feature.geometry?.type))
    })
    return ids
  }

  moveToFront (id) {
    moveIdToFront(this._order, id)
    this._applyOrder()
  }

  moveToBack (id) {
    moveIdToBack(this._order, id)
    this._applyOrder()
  }

  moveForward (id) {
    moveIdForward(this._order, id)
    this._applyOrder()
  }

  moveBackward (id) {
    moveIdBackward(this._order, id)
    this._applyOrder()
  }

  changeMode (name, options = {}) {
    if (name === 'edit_vertex' || name === 'edit_point') {
      this._editingFeatureId = options.featureId ?? null
      // The feature must already be in mapbox-gl-draw's own store before its edit mode's own
      // setup runs — a safe no-op if it isn't currently committed (e.g. already mid-edit).
      if (options.featureId) {
        this.beginEditFromOwnLayers(options.featureId)
      }
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
    return resolvePointSymbol({ store: this._pointStore, mapProvider: this._mapProvider, map: this._map, featureId, properties })
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

  // Checks our own committed-feature registry first, then mapbox-gl-draw's own store — a
  // feature only ever lives in one or the other, never both, so this always finds it
  // regardless of whether it's settled or currently mid-edit.
  get (id) { return this._committedFeatures.get(id) ?? this._draw.get(id) }

  // A directly-added Point (e.g. api/addFeature.js) skips draw_point's own icon-resolving
  // drawend handler, so it must be resolved here instead — with no fallback, styles.js's
  // point-symbol layer would otherwise render nothing at all.
  add (feature) {
    this.commitFeature(feature)
    if (feature.geometry?.type === 'Point' && hasSymbolStyle(feature.properties)) {
      this._resolvePointSymbol(feature.id, feature.properties)
    }
    return [feature.id]
  }

  // Patches an existing feature's style properties (stroke/fill/strokeWidth or symbol-family
  // keys) and re-renders. A committed feature routes through add() itself so a Point's icon
  // gets re-resolved the same way a directly-added one does, for free. A feature currently
  // mid-edit must NOT go through commitFeature() — that would pull it out of the live edit
  // session's own store mid-session — so it's patched directly instead, exactly as add() used
  // to unconditionally do; the edit session already owns its rendering until it ends.
  setStyle (id, properties) {
    const feature = this.get(id)
    if (!feature) {
      return
    }
    const updated = { ...feature, properties: { ...feature.properties, ...properties } }
    if (this._committedFeatures.has(id)) {
      this.add(updated)
      return
    }
    this._draw.add(updated)
    if (updated.geometry?.type === 'Point' && hasSymbolStyle(updated.properties)) {
      this._resolvePointSymbol(id, updated.properties)
    }
  }

  // Removes from whichever registry actually holds the id — both calls are safe no-ops
  // against the one that doesn't.
  delete (id) {
    this.removeCommittedFeature(id)
    this._draw.delete(id)
  }

  deleteAll () {
    [...this._committedFeatures.keys()].forEach((id) => this.removeCommittedFeature(id))
    this._draw.deleteAll()
  }

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
  _handleStyleData (e) {
    // map.addSource/addLayer/moveLayer below all fire their own synchronous styledata event,
    // re-entering this handler before the outer call has finished — without this guard, the
    // reload-detection branch below could see its own in-progress work as "still missing" and
    // try to recreate the same feature's layer group a second time, throwing on the duplicate
    // source. A genuine, independent styledata event is never nested inside our own call stack
    // (JS is single-threaded), so skipping while already running never drops one.
    if (this._handlingStyleData) {
      return
    }
    this._handlingStyleData = true
    try {
      this._handleStyleDataInner(e)
    } finally {
      this._handlingStyleData = false
    }
  }

  _handleStyleDataInner (e) {
    // A style reload re-adds the draw layers with their spec-default visibility
    // (solid stroke shown, dashed hidden) — re-assert the cached stroke state so
    // an invalid shape stays dashed across the reload.
    this._liveStroke.refresh()

    // A reload wipes every layer, including the anchor and every committed feature's own
    // ones — rebuild them all from our own retained registry (the feature data itself is
    // never lost, only its on-map rendering). Gated on dataType === 'style' (a genuine style
    // reload), not just the anchor being absent — our own addSource/addLayer calls fire this
    // same event tagged dataType: 'source', and the anchor is legitimately, transiently absent
    // during the very first commit or two (created lazily, debounced) before any reload has
    // ever happened — treating that as "reload, recreate everything" crashed on the source
    // that was already being created one stack frame up.
    if (e?.dataType === 'style' && this._committedFeatures.size && !this._map.getLayer(ANCHOR_ID)) {
      // Must exist before any feature layer is inserted before it — otherwise the very first
      // one throws immediately, since a beforeId that doesn't exist is invalid.
      ensureAnchorLayer(this._map)
      this._committedFeatures.forEach((feature) => {
        createFeatureLayerGroup({ map: this._map, feature, mapStyle: this._map._drawCurrentMapStyle, colors: this._getColors(), beforeId: ANCHOR_ID })
      })
      this._applyOrder()
    }

    const isOwnLayer = (l) => l.source?.startsWith('mapbox-gl-draw') || isDrawOwnedLayerId(l.id)
    const layers = this._map.getStyle().layers || []
    if (!layers.length || isOwnLayer(layers[layers.length - 1])) {
      return
    }
    layers
      .filter(isOwnLayer)
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
