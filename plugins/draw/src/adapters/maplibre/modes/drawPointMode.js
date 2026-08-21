import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { createLifecycle } from './drawMode/lifecycle.js'
import { validatePlacement } from '../../../validation/validateGeometry.js'
import {
  getSnapInstance, isSnapEnabled, isSnapActive, getSnapLngLat, triggerSnapAtPoint, triggerSnapAtCenter
} from '../utils/snapHelpers.js'

const MODE = 'draw_point'

// Only these keys signal a switch to keyboard drawing (matches drawMode/createDrawMode.js's
// INTERFACE_KEYS) — modifier keys and shortcut chords like cmd+z must not show the crosshair.
const INTERFACE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'])

// A point has no ring/rubber-band to build a candidate from — just the coordinate about to be
// placed. Mirrors validateGeometry.js's attemptPlacement, but that helper hardcodes
// Polygon/LineString via MODE_BY_GEOMETRY, so a Point candidate is built and validated directly.
const canPlace = (map, coord) => {
  const candidate = { type: 'Feature', geometry: { type: 'Point', coordinates: coord }, properties: {} }
  const { valid, reason } = validatePlacement(
    candidate,
    { mode: MODE, vertexIndex: 0 },
    { onGeometryChange: map._drawGeometryValidator }
  )
  if (!valid) {
    map.fire('draw.placementblocked', { feature: candidate, reason: reason ?? null, phase: 'place', mode: MODE, vertexIndex: 0 })
  }
  return valid
}

const ParentMode = MapboxDraw.modes.draw_point

// createLifecycle is the one createDrawMode cluster that IS reused here — its onSetup/onStop
// are genuinely geometry-agnostic (event binding/teardown, crosshair show/hide), not coupled
// to the ring-of-vertices shape the other clusters (clickHandlers, keyboardHandlers,
// pointerHandlers, undoHandlers, renderHelpers) are built around. See the mode's own handlers
// below for why those aren't reused.
const lifecycle = createLifecycle({ ParentMode, featureProp: 'point', excludeFeatureIdFromSetup: false })

const pointHandlers = {
  // Neutralise the built-in's onKeyUp (Escape/Enter both cancel) — this mode's Escape/Enter
  // handling lives entirely in onKeyup (lowercase, window-level) below, which fires for both
  // keyboard-focused and mouse/touch sessions alike, so there is nothing left for the
  // container-scoped capital-U hook to do.
  onKeyUp () {},

  _showCrossHair (state) {
    if (state.crossHair) { state.crossHair.show() } else { state.vertexMarker.style.display = 'block' }
  },

  _hideCrossHair (state) {
    if (state.crossHair) { state.crossHair.hide() } else { state.vertexMarker.style.display = 'none' }
  },

  _setInterface (state, type, show = true) {
    state.interfaceType = type
    if (show) { this._showCrossHair(state) }
  },

  // Re-id the freshly created feature to the caller's requested id — mapbox-gl-draw assigns
  // its own id on creation, and the caller's featureId (passed through changeMode) must win.
  // Mirrors drawMode/clickHandlers.js's reidCreatedFeature. Symbol-image resolution runs
  // after the re-id (not before) so it writes to the feature under its final id — the
  // resolver itself is injected by the adapter via changeMode's options so this mode has
  // no direct dependency on symbolRegistry/mapProvider.
  onCreate (state, e) {
    const feature = e.features[0]
    this._ctx.api.delete(feature.id)
    feature.id = state.featureId
    this._ctx.api.add(feature, { userProperties: true })
    state.resolvePointSymbol?.(state.featureId, feature.properties)
  },

  onUndo () {}, // Nothing to undo before a single-click commit — satisfies createLifecycle's bind contract.
  onPointerup () {}, // No vertex count to report — ditto.

  // Keeps the snap indicator live at the crosshair as the map pans underneath it — the
  // point-mode equivalent of drawMode/pointerHandlers.js's onMove, minus the rubber-band
  // update (nothing to rubber-band for a single coordinate). Bound to MapLibre's own 'move'
  // event by createLifecycle, so this fires continuously while panning; also called
  // explicitly below wherever the interface type switches to touch/keyboard, so the
  // indicator appears immediately rather than waiting for the first pan.
  onMove (state) {
    if (['touch', 'keyboard'].includes(state.interfaceType) && isSnapEnabled(state)) {
      triggerSnapAtCenter(getSnapInstance(this.map), this.map)
    }
  },

  onBlur (state, e) {
    if (e.target !== state.container) { this._hideCrossHair(state) }
  },

  onPointerdown (state, e) {
    if (e.pointerType !== 'touch') { this._setInterface(state, 'mouse', false) }
  },

  onPointermove (state, e) {
    if (e.pointerType !== 'touch') { this._hideCrossHair(state) }
  },

  onTouchStart (state) { this._setInterface(state, 'touch'); this.onMove(state) },
  onTouchEnd (state) { this._setInterface(state, 'touch'); this.onMove(state) },

  onInterfaceTypeChange (state, e) {
    this._setInterface(state, e.interfaceType, ['touch', 'keyboard'].includes(e.interfaceType))
    this.onMove(state)
  },

  // Continuously track a snap candidate under the real cursor (mouse only — touch/keyboard
  // placement tracks the crosshair instead, triggered once at commit time in _placeAtCrossHair).
  onMouseMove (state, e) {
    if (isSnapEnabled(state)) {
      triggerSnapAtPoint(getSnapInstance(this.map), this.map, e.point)
    }
  },

  onVertexButtonClick (state, e) {
    if (state.addVertexButtonId && !this.map._undoInProgress && e.target.closest(`#${state.addVertexButtonId}`)) {
      this._placeAtCrossHair(state)
    }
  },

  onKeydown (state, e) {
    if (document.activeElement !== state.container) { return }
    if (e.key === 'Escape') { e.preventDefault(); return }
    if (e.key === 'Enter') { state.isActive = true }
    if (!INTERFACE_KEYS.has(e.key)) { return }
    this._setInterface(state, 'keyboard')
    this.onMove(state)
  },

  // Window-level: fires regardless of which element has focus, so mouse/touch users can
  // Escape a pending placement without ever focusing the map, and keyboard users placing via
  // crosshair can commit with Enter. A point has no partial ring to reinitialize the way
  // line/polygon's Escape does, so Escape always routes to draw.cancel, keyboard-focused or not.
  onKeyup (state, e) {
    if (e.key === 'Escape') {
      this.map.fire('draw.cancel')
      return
    }
    if (document.activeElement !== state.container) { return }
    if (!INTERFACE_KEYS.has(e.key)) { return }
    this._setInterface(state, 'keyboard')
    this.onMove(state)
    if (e.key === 'Enter' && state.isActive) { this._placeAtCrossHair(state) }
  },

  onClick (state, e) {
    if (e.originalEvent.button > 0 || e.originalEvent.target !== this.map.getCanvas()) { return }
    const snap = getSnapInstance(this.map)
    const snapped = isSnapEnabled(state) && isSnapActive(snap) ? getSnapLngLat(snap) : null
    this._commit(state, snapped || e.lngLat)
  },

  onTap (state, e) { this.onClick(state, e) },

  // Touch "Add point" button and keyboard Enter both place at the crosshair (map centre),
  // snapping to a candidate under it if one exists. Deliberately bypasses onClick — its
  // button/canvas-target guards are real-mouse-click-only and would reject a synthetic commit,
  // the same reason drawMode/clickHandlers.js's doClick calls ParentMode.onClick directly
  // rather than going through its own wrapped onClick.
  _placeAtCrossHair (state) {
    const snap = getSnapInstance(this.map)
    if (isSnapEnabled(state)) { triggerSnapAtCenter(snap, this.map) }
    const snapped = isSnapEnabled(state) && isSnapActive(snap) ? getSnapLngLat(snap) : null
    this._commit(state, snapped || this.map.getCenter())
    // Unlike a real click (dispatched through mapbox-gl-draw's own mode-handler loop, which
    // re-renders automatically after every call), this runs from our own window/container
    // listeners outside that loop, so the render has to be requested explicitly.
    this._ctx.store.render()
  },

  // Hard gate: a vetoed placement never appears, mirroring drawMode/clickHandlers.js's
  // _canPlaceVertex. Shared by both the real-click and crosshair-commit paths.
  _commit (state, lngLat) {
    if (!canPlace(this.map, [lngLat.lng, lngLat.lat])) { return }
    state.point.updateCoordinate('', lngLat.lng, lngLat.lat)
    this.map.fire('draw.create', { features: [state.point.toGeoJSON()] })
  }
}

/**
 * Draw mode for placing a single point: mouse click, or crosshair + Enter/"Add point" button
 * for touch/keyboard. Commits immediately on the first placement — unlike draw_line/draw_polygon,
 * there is no rubber band, no multi-vertex undo, and no "Done" step; the mode self-exits via
 * events.js's onCreate handler once mapbox-gl-draw fires 'draw.create'.
 *
 * Wraps mapbox-gl-draw's own built-in draw_point mode (MapboxDraw.modes.draw_point) for
 * onSetup/onStop/toDisplayFeatures/onTrash — it already creates and tracks the in-progress
 * point feature, and cleans up an uncommitted one on stop. Its onClick/onTap/onKeyUp are
 * overridden outright: the built-in has no placement-veto hook, and treats both Escape and
 * Enter as "abandon and revert to simple_select" — this app needs Enter to place, and a
 * cancel path that goes through draw.cancel like every other mode's does.
 */
export const DrawPointMode = { ...ParentMode, ...lifecycle, ...pointHandlers }
