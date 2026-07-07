import { coordToPixel, pixelDist } from '../utils/olCoords.js'
import { getLastPlacedSketchCoord } from '../utils/sketchHelpers.js'

const SNAP_TOLERANCE = 12 // pixels
// Minimum ring length to allow snap-to-close (placed vertices + rubber-band)
const MIN_SKETCH_COORDS = { Polygon: 4, LineString: 3 }
const DUPLICATE_TOLERANCE_PX = 2

export const isCloseToFirstVertex = (map, coord, sketchCoords, geometryType) => {
  if (geometryType !== 'Polygon' || sketchCoords.length < MIN_SKETCH_COORDS.Polygon) {
    return false
  }
  const currentPixel = coordToPixel(map, coord)
  const firstPixel = coordToPixel(map, sketchCoords[0])
  if (!currentPixel || !firstPixel) {
    return false
  }
  return pixelDist(currentPixel, firstPixel) < SNAP_TOLERANCE
}

export const applyRubberbanding = (geom, centerCoord) => {
  if (geom.getType() === 'LineString') {
    const updated = [...geom.getCoordinates()]
    updated[updated.length - 1] = centerCoord
    geom.setCoordinates(updated)
  } else if (geom.getType() === 'Polygon') {
    const updated = geom.getCoordinates().map((ring, i) => {
      if (i !== 0) {
        return ring
      }
      const r = [...ring]
      r[r.length - 1] = centerCoord
      return r
    })
    geom.setCoordinates(updated)
  } else {
    // No action
  }
}

/**
 * Close/finish handling for a placed coordinate. Pure with respect to the
 * lastPlacedCoord bookkeeping: returns the updated value alongside whether the
 * coordinate was consumed as a close/finish attempt (caller must not append).
 *
 * @returns {{ handled: boolean, lastPlacedCoord: number[] | null }}
 */
const tryClose = ({ drawInteraction, canFinish, geom, sketchCoords, coord, lastPlacedCoord }) => {
  if (lastPlacedCoord && lastPlacedCoord[0] === coord[0] && lastPlacedCoord[1] === coord[1]) {
    // Same position as last placed: don't duplicate. Close only if enough real vertices exist.
    if (canFinish?.()) { drawInteraction.finishDrawing() }
    return { handled: true, lastPlacedCoord: null }
  }
  const map = drawInteraction.getMap()
  if (isCloseToFirstVertex(map, coord, sketchCoords, geom.getType())) {
    drawInteraction.finishDrawing()
    return { handled: true, lastPlacedCoord }
  }
  // When the add-vertex button overlays the map (touch UI), OL's native pointer handler
  // and this button click handler both fire for the same tap. Detect that OL already
  // committed a vertex at coord's position and skip the duplicate appendCoordinates,
  // but register coord as lastPlacedCoord so a second tap at the same position can close.
  const lastCommitted = getLastPlacedSketchCoord(geom)
  if (lastCommitted) {
    const p1 = map.getPixelFromCoordinate(lastCommitted)
    const p2 = map.getPixelFromCoordinate(coord)
    if (p1 && p2) {
      const dx = p1[0] - p2[0]; const dy = p1[1] - p2[1]
      if (dx * dx + dy * dy < DUPLICATE_TOLERANCE_PX * DUPLICATE_TOLERANCE_PX) {
        return { handled: true, lastPlacedCoord: coord }
      }
    }
  }
  return { handled: false, lastPlacedCoord }
}

/**
 * Crosshair-driven vertex placement for touch/keyboard drawing.
 *
 * Owns the sketch-feature and last-placed-coordinate bookkeeping via the Draw
 * interaction's lifecycle events, and implements placing a vertex at the map
 * center: rubber-band updates, duplicate suppression when OL already committed
 * the same tap, close-on-repeat and close-near-first-vertex behaviour.
 *
 * @returns {{ placeVertex, updateRubberbanding, clearLastCoord }}
 */
export const createVertexPlacement = ({ drawInteraction, mapProvider, snap, canFinish, canPlace, getInterfaceType }) => {
  let sketchFeature = null
  let lastPlacedCoord = null

  const resetSketch = (feature = null) => {
    sketchFeature = feature
    lastPlacedCoord = null
  }
  drawInteraction.on('drawstart', (e) => resetSketch(e.feature))
  drawInteraction.on('drawend', () => resetSketch())
  drawInteraction.on('drawabort', () => resetSketch())

  const snappedCenter = () => {
    const raw = mapProvider.getCenter()
    return (getInterfaceType() !== 'mouse' && snap) ? snap.apply(raw) : raw
  }

  const updateRubberbanding = () => {
    if (!sketchFeature) {
      // No sketch yet — update snap indicator at crosshair position so targets are
      // visible before the first vertex is placed (touch/keyboard only; mouse uses
      // the OL snap interaction's pointermove handler instead).
      if (getInterfaceType() !== 'mouse' && snap) {
        snap.apply(mapProvider.getCenter())
      }
      return
    }
    const geom = sketchFeature.getGeometry()
    if (!geom.getCoordinates().length) {
      return
    }
    applyRubberbanding(geom, snappedCenter())
  }

  const placeVertex = () => {
    const coord = snappedCenter()
    snap?.hideIndicator()
    if (sketchFeature) {
      const geom = sketchFeature.getGeometry()
      const rawCoords = geom.getCoordinates()
      const sketchCoords = geom.getType() === 'Polygon' ? (rawCoords[0] || []) : rawCoords
      const result = tryClose({ drawInteraction, canFinish, geom, sketchCoords, coord, lastPlacedCoord })
      lastPlacedCoord = result.lastPlacedCoord
      if (result.handled) { return }
    }
    // appendCoordinates bypasses the Draw interaction's condition, so the placement
    // gate must run here explicitly — touch/keyboard parity with the mouse path.
    if (canPlace && !canPlace(coord)) { return }
    drawInteraction.appendCoordinates([coord])
    lastPlacedCoord = coord
  }

  return {
    placeVertex,
    updateRubberbanding,
    clearLastCoord () { lastPlacedCoord = null }
  }
}
