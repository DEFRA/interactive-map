import PointerInteraction from 'ol/interaction/Pointer.js'

/**
 * Mouse/pointer drag for edit_point — a hand-rolled `ol/interaction/Pointer` rather than
 * edit/modifyInteraction.js's OL `Modify` wrapper. `Modify` snaps the dragged coordinate
 * straight to the pointer, which is fine for a small vertex dot but jumps a symbol icon under
 * the cursor the moment you click anywhere off its anchor — this instead holds a fixed
 * click-to-anchor offset for the whole drag, so the icon moves exactly as far as the pointer
 * does. Snap is applied to that offset-corrected candidate (read from .pixel, since
 * snap/snapInteraction.js may already have rewritten .coordinate to something near the raw
 * pointer) rather than the raw pointer itself, for the same reason.
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

  // .pixel is never rewritten by snap/snapInteraction.js (unlike .coordinate), so it's the
  // reliable way to get the true pointer position.
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
    // Not hiding the snap indicator here — handleDragEvent's own snap.apply() already left it
    // showing correctly, and it should stay that way after the drag ends.
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
