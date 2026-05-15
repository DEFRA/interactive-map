/**
 * Input handling for draw mode: touch, keyboard, and button events.
 *
 * Mouse/pointer drawing is handled entirely by OL's Draw interaction.
 * This module handles the crosshair-based input path (touch + keyboard)
 * and the Done / Add Point / Cancel button wiring.
 */

import { coordToPixel, pixelDist } from '../utils/olCoords.js'

const SNAP_TOLERANCE = 12 // pixels
const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])

/**
 * @param {object} params
 * @param {import('ol/interaction/Draw').default} params.drawInteraction
 * @param {import('../core/OLDrawManager').OLDrawManager} params.manager
 * @param {object} params.options - { container, interfaceType, addVertexButtonId, mapProvider, crossHair }
 * @returns {{ destroy: () => void }}
 */
export const createDrawInput = ({ drawInteraction, manager, options }) => {
  const { container, addVertexButtonId, mapProvider, crossHair } = options
  let interfaceType = options.interfaceType
  let map = null
  let sketchFeature = null
  let pendingVertexUpdate = null
  let lastPlacedCoord = null

  // Track sketch feature from draw events
  const onDrawStart = (e) => {
    sketchFeature = e.feature
    lastPlacedCoord = null
  }

  const onDrawEnd = () => {
    sketchFeature = null
    lastPlacedCoord = null
    if (pendingVertexUpdate) {
      clearTimeout(pendingVertexUpdate)
      pendingVertexUpdate = null
    }
  }

  drawInteraction.on('drawstart', onDrawStart)
  drawInteraction.on('drawend', onDrawEnd)
  drawInteraction.on('drawabort', onDrawEnd)

  // Get map reference — drawInteraction is already added to map before createDrawInput is called
  const getMap = () => {
    if (!map) {
      map = drawInteraction.getMap()
    }
    return map
  }

  const olMap = drawInteraction.getMap()

  // OL's CanvasVectorLayerRenderer skips re-rendering when viewHints[ANIMATING] > 0 and
  // updateWhileAnimating is false (the default). Without this, geometry updates in precompose
  // are ignored during keyboard pan animation — the overlay uses a cached render.
  const overlayLayer = typeof drawInteraction.getOverlay === 'function' ? drawInteraction.getOverlay() : null
  if (overlayLayer) {
    overlayLayer.updateWhileAnimating_ = true
  }

  // --- Update sketch feature rubber band to current map centre ---
  // Accepts an optional pre-computed coord; falls back to mapProvider.getCenter() otherwise.
  const updateSketchRubberbanding = (centerCoord) => {
    if (!sketchFeature) return

    const geom = sketchFeature.getGeometry()
    const coords = geom.getCoordinates()
    if (coords.length === 0) return

    const center = centerCoord ?? mapProvider.getCenter()

    if (geom.getType() === 'LineString') {
      const updated = [...coords]
      updated[updated.length - 1] = center
      geom.setCoordinates(updated)
    } else if (geom.getType() === 'Polygon') {
      const updated = coords.map((ring, ringIdx) => {
        if (ringIdx !== 0) return ring
        const ringUpdated = [...ring]
        ringUpdated[ringUpdated.length - 1] = center
        return ringUpdated
      })
      geom.setCoordinates(updated)
    }

    // OL's Draw interaction keeps a separate sketchPoint_ feature (the dot at the rubber-band
    // tip). It only updates via pointer events, so during keyboard pan it stays frozen at the
    // last mouse position. Move it to match the polygon/line rubber-band endpoint.
    const sketchPoint = drawInteraction.sketchPoint_
    if (sketchPoint) {
      sketchPoint.getGeometry().setCoordinates(center)
    }
  }

  // OL's view.animate() calls applyTargetState_() each rAF → fires change:center with the
  // interpolated center each frame. mapProvider.getCenter() returns the raw (non-padding-
  // adjusted) center, which is what renders at the safezone/crosshair CSS position.
  // Using frameState.viewState.center would give the padding-adjusted center, which renders
  // at the container's 50%/50% — offset from the crosshair when OL view padding is set.
  const onCenterChange = () => {
    if (interfaceType === 'pointer') { return }
    updateSketchRubberbanding()
  }

  if (olMap) {
    olMap.getView().on('change:center', onCenterChange)
  }

  // --- Update vertex count display after appending coordinates ---
  const updateDisplayedVertexCount = () => {
    if (!sketchFeature) return
    const geom = sketchFeature.getGeometry()
    const rawCoords = geom.getCoordinates()

    let numVertecies = 0

    if (geom.getType() === 'Polygon' && rawCoords.length > 0) {
      // For Polygon, OL stores rings as [[x1,y1], [x2,y2], ..., [x1,y1], rubber-band]
      // We need to subtract: 1 for closing vertex + 1 for rubber-band = 2 total
      const exteriorRing = rawCoords[0]
      numVertecies = Math.max(0, exteriorRing.length - 2)
    } else if (geom.getType() === 'LineString') {
      // For LineString, OL stores coords with trailing rubber-band: [v1, v2, ..., vN, rubber]
      // Subtract 1 for the rubber-band coordinate
      numVertecies = Math.max(0, rawCoords.length - 1)
    }

    manager.emit('vertexchange', { numVertecies })
  }

  // --- Place a vertex at the current map center (crosshair position) ---
  const placeVertex = () => {
    const map = getMap()
    const coord = mapProvider.getCenter()

    if (sketchFeature) {
      const geom = sketchFeature.getGeometry()
      const rawCoords = geom.getCoordinates()

      // For Polygon: rawCoords is array of rings, get exterior ring coords
      // For LineString: rawCoords is the coord array directly
      let sketchCoords = rawCoords
      if (geom.getType() === 'Polygon') {
        sketchCoords = rawCoords[0] || []
      }

      // Check if same coord placed twice consecutively (without moving crosshair)
      // For polygons: need at least 2 user vertices before allowing double-tap close
      // For lines: need at least 1 user vertex before allowing double-tap close
      if (lastPlacedCoord &&
          lastPlacedCoord[0] === coord[0] &&
          lastPlacedCoord[1] === coord[1]) {
        // Check minimum vertices before finishing
        let numVertecies = 0
        if (geom.getType() === 'Polygon' && sketchCoords.length > 0) {
          numVertecies = Math.max(0, sketchCoords.length - 2)
        } else if (geom.getType() === 'LineString') {
          numVertecies = Math.max(0, sketchCoords.length - 1)
        }

        const minForFinish = geom.getType() === 'Polygon' ? 2 : 1
        if (numVertecies >= minForFinish) {
          drawInteraction.finishDrawing()
          lastPlacedCoord = null
          return
        }
      }

      // Check if close to first vertex (for polygon closure via proximity)
      if (geom.getType() === 'Polygon' && sketchCoords.length >= 4) {
        const firstCoord = sketchCoords[0]
        const currentPixel = coordToPixel(map, coord)
        const firstPixel = coordToPixel(map, firstCoord)
        if (currentPixel && firstPixel && pixelDist(currentPixel, firstPixel) < SNAP_TOLERANCE) {
          drawInteraction.finishDrawing()
          lastPlacedCoord = null
          return
        }
      }
    }

    drawInteraction.appendCoordinates([coord])
    lastPlacedCoord = coord

    // Cancel any pending update and schedule a new one
    // This ensures we only emit the final calculated count after OL finishes updating
    if (pendingVertexUpdate) {
      clearTimeout(pendingVertexUpdate)
    }
    pendingVertexUpdate = setTimeout(() => {
      updateDisplayedVertexCount()
      pendingVertexUpdate = null
    }, 10)
  }

  // --- Event handlers ---
  const onKeydown = (e) => {
    if (document.activeElement !== container) { return }
    if (ARROW_KEYS.has(e.key)) {
      if (interfaceType !== 'keyboard') {
        interfaceType = 'keyboard'
        crossHair?.fixAtCenter()
        updateSketchRubberbanding()
      }
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (interfaceType !== 'keyboard') {
        interfaceType = 'keyboard'
        crossHair?.fixAtCenter()
      }
      placeVertex()
    }
  }

  // Button click covers both Add Point button and any element inside it
  const onButtonClick = (e) => {
    if (addVertexButtonId && e.target.closest(`#${addVertexButtonId}`)) {
      placeVertex()
    }
  }

  const onPointerdown = (e) => {
    if (e.pointerType !== 'touch' && interfaceType !== 'pointer') {
      interfaceType = 'pointer'
      crossHair?.hide()
    }
  }

  const onTouchstart = () => {
    if (interfaceType !== 'touch') {
      interfaceType = 'touch'
      crossHair?.fixAtCenter()
      updateSketchRubberbanding()
    }
  }

  const onPointerMove = (e) => {
    if (e.pointerType === 'mouse') {
      if (interfaceType !== 'pointer') {
        interfaceType = 'pointer'
        crossHair?.hide()
      }
      return // OL's Draw interaction handles mouse rubber-banding natively
    }
    if (interfaceType === 'pointer') { return }
    updateSketchRubberbanding()
  }

  window.addEventListener('keydown', onKeydown)
  window.addEventListener('click', onButtonClick)
  container.addEventListener('pointerdown', onPointerdown)
  container.addEventListener('touchstart', onTouchstart, { passive: true })
  container.addEventListener('pointermove', onPointerMove)

  return {
    getInterfaceType: () => interfaceType,

    destroy () {
      if (pendingVertexUpdate) {
        clearTimeout(pendingVertexUpdate)
      }
      if (olMap) {
        olMap.getView().un('change:center', onCenterChange)
      }
      window.removeEventListener('keydown', onKeydown)
      window.removeEventListener('click', onButtonClick)
      container.removeEventListener('pointerdown', onPointerdown)
      container.removeEventListener('touchstart', onTouchstart)
      container.removeEventListener('pointermove', onPointerMove)
      drawInteraction.un('drawstart', onDrawStart)
      drawInteraction.un('drawend', onDrawEnd)
      drawInteraction.un('drawabort', onDrawEnd)
    }
  }
}
