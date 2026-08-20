import PointerInteraction from 'ol/interaction/Pointer.js'

/**
 * Mouse/pointer drag for edit_point — a hand-rolled `ol/interaction/Pointer` rather than
 * edit/modifyInteraction.js's OL `Modify` wrapper used for a Polygon/LineString's own vertices.
 *
 * `Modify` always snaps the coordinate it's dragging straight to the pointer position on every
 * move — correct for a small ~6px vertex dot, where a click inevitably lands right on top of it
 * so there's no perceptible offset to preserve. A symbol icon is different:
 * buildPointModifyCondition (point/editPointMode.js) accepts a mousedown anywhere on the icon's
 * own rendered pixels, which can be well away from the actual anchor coordinate (e.g. near the
 * top of a pin whose anchor sits at its tip). Handing that off to `Modify` yanks the anchor
 * straight under the pointer on the first move, then tracks the pointer with zero offset from
 * there — a visible jump, and it makes fine positioning with the mouse far harder than it should
 * be. This interaction instead captures the map-coordinate offset between the click and the
 * anchor at drag start and holds it for the whole drag, so the icon moves exactly as far as the
 * pointer does rather than snapping under it — the same "grab point" feel edit/touchHandler.js
 * already gives the touch offset-target drag.
 *
 * Snapping needs the same offset correction, and can't reuse snap/snapInteraction.js's usual
 * free ride: that OL Interaction rewrites mapBrowserEvent.coordinate to the nearest candidate
 * near the raw POINTER position, which is exactly right for Modify (dragging a vertex you
 * clicked right on) but wrong here — it would snap based on wherever the cursor happens to be
 * inside the icon, not the icon's own anchor. So this reads the true, unsnapped pointer
 * coordinate straight from the event's pixel (untouched by that rewrite, unlike .coordinate),
 * reconstructs the icon's own candidate position from it via the grab offset, and only then
 * calls snap.apply() on THAT — mirroring edit/touchHandler.js's handleTouchMove, which snaps
 * the offset-corrected coordinate for the same reason.
 *
 * @param {{ map, olFeature, getState, condition, snap, onModifyEnd }} options
 * @param {(mapBrowserEvent) => boolean} options.condition - gates drag start, e.g.
 *   buildPointModifyCondition's forEachFeatureAtPixel icon hit-test.
 * @param {{ apply } | null} [options.snap] - snap/snapManager.js's controller, or
 *   null/undefined when no snap layers are configured.
 * @param {(prevCoords: number[][]) => void} options.onModifyEnd - called once at drag end with
 *   the single-coordinate vertices array as it stood at drag start — same shape
 *   edit/modifyInteraction.js's onModifyEnd gets, so callers can share its deriveModifyOp.
 * @returns {{ destroy: () => void }}
 */
export const createPointDragInteraction = ({ map, olFeature, getState, condition, snap, onModifyEnd }) => {
  let grabOffset = null // [dx, dy] map-coordinate offset (anchor − pointer), held for the drag
  let startCoord = null

  // .coordinate may already have been rewritten by snap/snapInteraction.js before this
  // interaction ever sees the event (it's added after ours, so processed first) — .pixel is
  // never touched by that rewrite, so re-deriving from it is the only reliable way to get the
  // actual pointer position back.
  const pointerCoord = (mapBrowserEvent) => map.getCoordinateFromPixel(mapBrowserEvent.pixel)

  const handleDownEvent = (mapBrowserEvent) => {
    if (getState().interfaceType === 'touch' || !condition(mapBrowserEvent)) {
      return false
    }
    const coord = olFeature.getGeometry().getCoordinates()
    const pointer = pointerCoord(mapBrowserEvent)
    grabOffset = [coord[0] - pointer[0], coord[1] - pointer[1]]
    startCoord = [...coord]
    return true
  }

  const handleDragEvent = (mapBrowserEvent) => {
    if (!grabOffset) {
      return
    }
    const pointer = pointerCoord(mapBrowserEvent)
    const rawCoord = [pointer[0] + grabOffset[0], pointer[1] + grabOffset[1]]
    const newCoord = snap ? snap.apply(rawCoord) : rawCoord
    olFeature.getGeometry().setCoordinates(newCoord)
  }

  const handleUpEvent = () => {
    grabOffset = null
    // Deliberately NOT hiding the snap indicator here — handleDragEvent's own snap.apply()
    // already left it showing exactly if the point landed on a snap target, and it should stay
    // that way after the drag ends (mirrors the ML adapter, which never hides it on release
    // either — see snap/snapInteraction.js's own comment on the matching Modify-drag case).
    if (startCoord) {
      onModifyEnd([startCoord])
    }
    startCoord = null
    return false // ends the drag sequence — never chains into another
  }

  const interaction = new PointerInteraction({ handleDownEvent, handleDragEvent, handleUpEvent })
  map.addInteraction(interaction)

  return {
    destroy () {
      map.removeInteraction(interaction)
    }
  }
}
