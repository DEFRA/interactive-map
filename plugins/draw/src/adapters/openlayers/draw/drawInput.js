import { createVertexPlacement } from './vertexPlacement.js'
import { stopIfGlobalAltKey } from '../../../../../../src/utils/globalAltShortcuts.js'

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])

// Mirrors DrawInit.jsx's fixAtCenter()/hide() gate, but reasserted on every interface-type transition this module detects — matching MapLibre's own onSetup/onInterfaceTypeChange redundancy.
// Exported alongside wireInputEvents for the same reason — point/drawPointMode.js reuses it directly.
export const applyCrossHairVisibility = (crossHair, type) => {
  if (!crossHair) { return }
  if (['touch', 'keyboard'].includes(type)) {
    crossHair.fixAtCenter()
  } else {
    crossHair.hide()
  }
}

// Exported so point/drawPointMode.js can reuse this DOM-wiring layer directly — it's
// already generic (crosshair/interface-type tracking, add-vertex-button/Enter/undo
// listeners), parametrised entirely by the callbacks passed in, with no ring-shaped
// assumptions baked in. draw_point supplies point-shaped versions of those callbacks
// (no rubber band, no undo) rather than this file growing a second copy of the wiring.
export const wireInputEvents = ({
  container, addVertexButtonId, olView, onUndo,
  getInterfaceType, setInterfaceType, clearLastCoord,
  updateRubberbanding, placeVertex
}) => {
  // Normally gated to touch/keyboard — a real mouse cursor drives the candidate via its own
  // pointermove instead. But Voice Control's simulated clicks report pointerType 'mouse' (so
  // interfaceType never leaves 'mouse') and produce no pointermove at all, so panning via
  // MoveControls while interfaceType is 'mouse' would otherwise leave the candidate stale.
  // olView.getAnimating() is also true for MoveControls' own panBy/zoomIn/zoomOut (both use
  // view.animate) but not for a live mouse drag (which sets the center directly, no
  // animation) — the same fallback signal used below in onMapRender.
  const onCenterChange = () => {
    if (getInterfaceType() !== 'mouse' || olView?.getAnimating()) {
      updateRubberbanding()
    }
  }
  olView?.on('change:center', onCenterChange)

  const onKeydown = (e) => {
    if (!container.contains(document.activeElement)) {
      return
    }
    if (ARROW_KEYS.has(e.key)) {
      setInterfaceType('keyboard')
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      setInterfaceType('keyboard')
      placeVertex()
    }
    if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onUndo?.()
    }
  }

  const onButtonClick = (e) => {
    if (addVertexButtonId && e.target.closest(`#${addVertexButtonId}`)) {
      placeVertex()
    }
  }

  const onPointerdown = (e) => {
    if (e.pointerType !== 'touch') {
      setInterfaceType('mouse')
      clearLastCoord()
    }
  }

  const onTouchstart = () => {
    setInterfaceType('touch')
  }

  const onPointerMove = () => {
    if (getInterfaceType() === 'mouse') {
      return
    }
    updateRubberbanding()
  }

  globalThis.addEventListener('keydown', onKeydown)
  globalThis.addEventListener('click', onButtonClick)
  container.addEventListener('pointerdown', onPointerdown)
  container.addEventListener('touchstart', onTouchstart, { passive: true })
  container.addEventListener('pointermove', onPointerMove)
  // Capture phase, separate from onKeydown above — shadows global Alt+<key> shortcuts
  // (src/utils/globalAltShortcuts.js) unconditionally while drawing.
  globalThis.addEventListener('keyup', stopIfGlobalAltKey, { capture: true })

  return {
    destroy () {
      olView?.un('change:center', onCenterChange)
      globalThis.removeEventListener('keydown', onKeydown)
      globalThis.removeEventListener('click', onButtonClick)
      container.removeEventListener('pointerdown', onPointerdown)
      container.removeEventListener('touchstart', onTouchstart)
      container.removeEventListener('pointermove', onPointerMove)
      globalThis.removeEventListener('keyup', stopIfGlobalAltKey, { capture: true })
    }
  }
}

/**
 * Touch/keyboard input wiring for draw mode: crosshair vertex placement via the
 * add-vertex button or Enter, keyboard undo, interface-type tracking, and
 * rubber-band updates while the map pans under the crosshair.
 *
 * @returns {{ getInterfaceType: () => string, destroy: () => void }}
 */
export const createDrawInput = ({ drawInteraction, options }) => {
  const { container, addVertexButtonId, mapProvider, snap, onUndo, canFinish, canPlace, crossHair } = options
  let interfaceType = options.interfaceType ?? 'mouse'
  const getInterfaceType = () => interfaceType

  const placement = createVertexPlacement({
    drawInteraction,
    mapProvider,
    snap,
    canFinish,
    canPlace
  })

  const map = drawInteraction.getMap()
  const olView = map?.getView()

  const events = wireInputEvents({
    container,
    addVertexButtonId,
    olView,
    onUndo,
    getInterfaceType,
    setInterfaceType: (t) => { interfaceType = t; applyCrossHairVisibility(crossHair, t) },
    clearLastCoord: placement.clearLastCoord,
    updateRubberbanding: placement.updateRubberbanding,
    placeVertex: placement.placeVertex
  })

  // Sync on creation too (mirrors MapLibre's own onSetup), so the crosshair reflects the mode's starting interface type immediately.
  applyCrossHairVisibility(crossHair, interfaceType)

  // Single shared "commit here" entry point for the crosshair button's own onClick
  // (CrossHair.jsx) — the same action Enter/the touch add-vertex button already trigger via
  // placeVertex, so a click (real, touch, or Voice Control's "Click Target") places the
  // next vertex exactly as those already do.
  if (crossHair) {
    crossHair.activate = placement.placeVertex
  }

  // change:center fires once when an animated pan starts; postrender tracks each frame.
  // getAnimating() alone (not also gated on interfaceType, unlike onCenterChange above) is
  // enough here: it's already only true for an animated move, which is what needs a
  // per-frame follow-up regardless of what interfaceType happens to be.
  const onMapRender = () => {
    if (olView?.getAnimating()) {
      placement.updateRubberbanding()
    }
  }
  map?.on('postrender', onMapRender)

  return {
    getInterfaceType,
    // Called when the global interface type changes without any pointer/touch/key
    // event landing on the map container (e.g. panning via MoveControls after
    // switching to touch) — refresh the rubber band immediately rather than
    // waiting for the next incidental change:center/postrender event.
    setInterfaceType (type) {
      interfaceType = type
      applyCrossHairVisibility(crossHair, type)
      if (type !== 'mouse') {
        placement.updateRubberbanding()
      }
    },
    destroy () {
      if (crossHair?.activate === placement.placeVertex) { crossHair.activate = null }
      events.destroy()
      map?.un('postrender', onMapRender)
    }
  }
}
