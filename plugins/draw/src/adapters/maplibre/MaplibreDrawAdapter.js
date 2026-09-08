import { createMapboxDraw } from './mapboxDraw.js'
import { getSnapInstance, clearSnapState, clearSnapIndicator } from './utils/snapHelpers.js'
import { createEventBus } from '../../utils/eventBus.js'
import { MAPBOX_DRAW_EVENTS, CUSTOM_DRAW_EVENTS, STYLE_DATA_EVENT } from './drawEvents.js'
import { ADAPTER_EVENTS } from '../../adapterEvents.js'
import { createLiveStroke } from '../../validation/liveStroke.js'
import { createLiveDrawChecks } from '../../validation/liveDrawChecks.js'
import { resolvePointSymbol, hasSymbolStyle } from './pointSymbolImages.js'
import { getCoords, getMidpointCoords } from './modes/editVertexMode/geometryHelpers.js'

const polygonFeature = (coordinates) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates } })
const lineFeature = (coordinates) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates } })
const pointFeature = (coordinates) => ({ type: 'Feature', geometry: { type: 'Point', coordinates } })

// mapbox-gl-draw's public get() returns closed rings (first coord repeated as last), but the
// running mode's own internal indexing has that duplicate stripped — getVertexItems() below
// reads via the public API, so it must correct for this or indexes drift across rings/parts.
const dedupeClosedRings = (geometry) => {
  if (geometry.type === 'Polygon') {
    return { ...geometry, coordinates: geometry.coordinates.map(ring => ring.slice(0, -1)) }
  }
  if (geometry.type === 'MultiPolygon') {
    return { ...geometry, coordinates: geometry.coordinates.map(poly => poly.map(ring => ring.slice(0, -1))) }
  }
  return geometry
}

// The displayed feature + vertex count for the live stroke check. MapLibre's fire() clobbers
// the payload's own geometry type, so it's inferred instead from the mode, or (in edit mode,
// which covers both shapes) from the coordinate nesting.
export const displayedShape = (mode, coordinates) => {
  if (mode === 'draw_polygon') {
    return { feature: polygonFeature(coordinates), numVertices: (coordinates[0]?.length ?? 1) - 1 }
  }
  if (mode === 'draw_line') {
    return { feature: lineFeature(coordinates), numVertices: (coordinates?.length ?? 1) - 1 }
  }
  if (mode === 'edit_vertex') {
    // Array.isArray(ring?.[0]) already proves ring is non-nullish, so the polygon branch below reuses it directly.
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
 *   getVertexItems() / selectVertex(index) / insertVertexAtMidpoint(index)
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
    // Assigned once per feature, on creation only (see styles.js's SORT_KEY_PROP) — drives
    // paint order so a later-drawn feature reliably layers above an earlier one.
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

    // Single owner of the dashed-stroke state — live moves feed update(), committed verdicts
    // land via setInvalid(). onChange does the actual layer toggle, and in edit mode also
    // gates the Done button (the displayed shape is exactly what Done finishes).
    this._liveStroke = createLiveStroke({
      onChange: (invalid, reason) => {
        this._applyStrokeInvalid(invalid)
        const mode = this._draw.getMode()
        if (mode === 'edit_vertex' || mode === 'edit_point') {
          this._bus.emit(ADAPTER_EVENTS.VALIDITY_CHANGE, { valid: !invalid, reason })
        }
      }
    })

    // Draw-mode-only: computes both the stroke/Done verdict and the Add-point verdict from one
    // throttled user callback (see liveDrawChecks.js). The stroke verdict still routes through
    // _liveStroke.set() to stay the single source of truth across mode switches; Add-point has
    // no such shared instance, so it emits directly.
    this._liveDrawChecks = createLiveDrawChecks({
      onStrokeChange: (invalid, reason) => this._liveStroke.set(invalid, reason),
      onPlaceChange: (vetoed, reason) => this._bus.emit(ADAPTER_EVENTS.CAN_PLACE_CHANGE, { canPlace: !vetoed, reason })
    })

    // Normalise ML map events → the shared adapter event contract (adapterEvents.js).
    // The OL adapter emits the same contract directly from OLDrawManager.
    this._mapHandlers = {
      create: (event) => {
        const feature = event.features[0]
        // Deferred a tick so the mode's own re-id (delete+re-add to the caller-requested id —
        // see drawPointMode.js's onCreate) finishes first, or this targets a stale feature id.
        setTimeout(() => {
          this._draw.setFeatureProperty(feature.id, 'sortKey', this._nextSortKey())
          this._bus.emit(ADAPTER_EVENTS.CREATE, this._draw.get(feature.id))
        }, 0)
      },
      editfinish: (event) => this._bus.emit(ADAPTER_EVENTS.EDIT_FINISH, event.features[0]),
      cancel: () => this._bus.emit(ADAPTER_EVENTS.CANCEL),
      vertexselection: (event) => this._bus.emit(ADAPTER_EVENTS.VERTEX_SELECTION, event),
      vertexchange: (event) => this._bus.emit(ADAPTER_EVENTS.VERTEX_CHANGE, event),
      undochange: (event) => this._bus.emit(ADAPTER_EVENTS.UNDO_CHANGE, event.length),
      update: (event) => this._bus.emit(ADAPTER_EVENTS.UPDATE, event.features[0]),
      geometrychange: (event) => {
        // Phase-less events are rubber-band moves carrying the in-progress feature — they
        // drive the live invalid stroke, and are cached for setDrawingPreviewProperty (which
        // has no stable id yet to target via setFeatureProperty).
        if (!event?.phase) {
          this._updateLiveStroke(event)
          this._currentDrawEvent = event
        }
        this._bus.emit(ADAPTER_EVENTS.GEOMETRY_CHANGE, event)
      },
      placementblocked: (event) => this._bus.emit(ADAPTER_EVENTS.PLACEMENT_BLOCKED, event),
      interfacetypechange: (event) => this._bus.emit(ADAPTER_EVENTS.INTERFACE_TYPE_CHANGE, { interfaceType: event.interfaceType }),
      modechange: (event) => this._handleModeChange(event),
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
    // The resolver is injected here so draw_point stays decoupled from how a symbol image
    // actually gets resolved/registered.
    if (name === 'draw_point') {
      options = { ...options, resolvePointSymbol: (featureId, properties) => this._resolvePointSymbol(featureId, properties) }
    }
    this._draw.changeMode(name, options)
    // mapbox-gl-draw's own changeMode never fires 'draw.modechange', so every mode change
    // requested through this adapter must drive the same cleanup manually.
    this._handleModeChange({ mode: name })
  }

  // Resolves and registers the feature's symbol-config icon, then writes the resolved image
  // id/anchor back so styles.js's point-symbol layer can render it.
  _resolvePointSymbol (featureId, properties) {
    return resolvePointSymbol({ draw: this._draw, mapProvider: this._mapProvider, map: this._map, featureId, properties })
  }

  // Live invalid-stroke driver, called on every rubber-band move (draw) and vertex drag/nudge
  // (edit). Draw mode routes through _liveDrawChecks (also computes the Add-point verdict);
  // edit mode goes straight through the live-stroke controller.
  _updateLiveStroke (event) {
    if (!event?.coordinates) { return }
    const mode = this._draw.getMode()
    const shape = displayedShape(mode, event.coordinates)
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
    // trash() only belongs to an in-progress, uncommitted draw. For edit_vertex, events.js has
    // already restored the original feature — trash() here would instead run direct_select's
    // own onTrash and silently discard that restore.
    if (mode === 'draw_polygon' || mode === 'draw_line') {
      this._draw.trash()
    }
    this._draw.changeMode('disabled')
    this._handleModeChange({ mode: 'disabled' })
  }

  undo () {
    this._map.fire(CUSTOM_DRAW_EVENTS.UNDO)
  }

  // MapControls' D-pad, routed here via mapProvider.activeMoveTarget once a vertex is
  // selected — bridged into the mode via event, same as setInterfaceType.
  nudgeSelectedVertex (dx, dy, isLargeStep) {
    this._map.fire(CUSTOM_DRAW_EVENTS.NUDGE_VERTEX, { dx, dy, isLargeStep })
  }

  // Read-only vertex/midpoint coordinates for the shared spatial listbox (useSpatialList.js).
  // Reads the committed feature via the public get() — the adapter has no reference into the
  // live mode (see selectVertex below) — flat across all rings/parts, matching the mode's own
  // selectedVertexIndex convention.
  getVertexItems () {
    const empty = { vertices: [], midpoints: [] }
    if (this._draw.getMode() !== 'edit_vertex' || !this._editingFeatureId) {
      return empty
    }
    const feature = this._draw.get(this._editingFeatureId)
    if (!feature) {
      return empty
    }
    const geometry = dedupeClosedRings(feature.geometry)
    return { vertices: getCoords(geometry), midpoints: getMidpointCoords(geometry) }
  }

  // Moves the live vertex/midpoint cursor to `index` — preview only, no geometry change.
  // Bridged into the mode via a custom event, same pattern as nudgeSelectedVertex.
  selectVertex (index) {
    this._map.fire(CUSTOM_DRAW_EVENTS.SELECT_VERTEX, { index })
  }

  // Commits a new vertex exactly at midpoint `index` (no directional offset, unlike the
  // keyboard/D-pad path) — the destructive counterpart to selectVertex's preview-only move.
  insertVertexAtMidpoint (index) {
    this._map.fire(CUSTOM_DRAW_EVENTS.INSERT_VERTEX_AT_MIDPOINT, { index })
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

  // Swaps which overlaid stroke layer is visible (solid vs dashed); fill is hidden while
  // invalid. Only the live-stroke controller calls this — everything else goes through setInvalid.
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
    // Intentionally a no-op on MapLibre — the ML edit mode already handles vertex deletion
    // itself (keyboard + its own click listener); deleting here too would double-delete.
    // The OL adapter implements this for real; here it only satisfies the shared interface.
  }

  get (id) { return this._draw.get(id) }

  _nextSortKey () {
    this._sortKeyCounter += 1
    return this._sortKeyCounter
  }

  // A directly-added Point skips draw_point's own icon-resolving handler, so it must be
  // resolved here instead, or styles.js's point-symbol layer renders nothing.
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

  // Patches an existing feature's style properties and re-renders via add(), so a Point's
  // icon gets re-resolved the same way a directly-added one does.
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

  // Tags the in-progress rubber-band feature (no stable id yet) with a property and
  // re-renders — used for live preview styling, e.g. split's valid/invalid line colour.
  setDrawingPreviewProperty (property, value) {
    const event = this._currentDrawEvent
    if (event?.properties) {
      event.properties[property] = value
    }
    event?.ctx?.store?.render()
  }

  on (type, handler) {
    this._bus.on(type, handler)
  }

  off (type, handler) {
    this._bus.off(type, handler)
  }

  _handleModeChange (event) {
    const DRAW_MODES = new Set(['draw_polygon', 'draw_line', 'draw_point', 'edit_vertex', 'edit_point'])
    if (!DRAW_MODES.has(event.mode)) {
      clearSnapIndicator(getSnapInstance(this._map), this._map)
    }
  }

  // Keeps draw layers on top after MapLibre style reloads
  _handleStyleData () {
    // A pending point-symbol resolution's map.addImage() call (pointSymbolImages.js) can fire
    // 'styledata' after the map's been torn down — getStyle() returns undefined then; no-op.
    const style = this._map.getStyle()
    if (!style) { return }
    // A style reload resets layers to spec-default visibility — re-assert the cached stroke
    // state so an invalid shape stays dashed.
    this._liveStroke.refresh()
    const layers = style.layers || []
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
