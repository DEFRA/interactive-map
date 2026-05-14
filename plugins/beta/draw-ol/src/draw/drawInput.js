/**
 * Input handling for draw mode: touch, keyboard, and button events.
 *
 * Mouse/pointer drawing is handled entirely by OL's Draw interaction.
 * This module handles the crosshair-based input path (touch + keyboard)
 * and the Done / Add Point / Cancel button wiring.
 */

import { coordToPixel, pixelDist } from '../utils/olCoords.js'
import { getCoords } from '../utils/geometryHelpers.js'

const SNAP_TOLERANCE = 12 // pixels

/**
 * @param {object} params
 * @param {import('ol/interaction/Draw').default} params.drawInteraction
 * @param {import('../core/OLDrawManager').OLDrawManager} params.manager
 * @param {object} params.options - { container, interfaceType, addVertexButtonId, mapProvider }
 * @returns {{ destroy: () => void }}
 */
export const createDrawInput = ({ drawInteraction, manager, options }) => {
  const { container, addVertexButtonId, mapProvider } = options
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

  // Get map reference when drawInteraction is added
  const getMap = () => {
    if (!map) {
      // drawInteraction is added to map in DrawMode; extract it
      map = drawInteraction.getMap()
    }
    return map
  }

  // --- Update sketch feature with current center (rubberbanding) ---
  const updateSketchRubberbanding = () => {
    if (!sketchFeature) return

    const geom = sketchFeature.getGeometry()
    const coords = geom.getCoordinates()
    if (coords.length === 0) return

    const centerCoord = mapProvider.getCenter()

    // For LineString, update the last (rubber-band) coordinate
    if (geom.getType() === 'LineString') {
      const updated = [...coords]
      updated[updated.length - 1] = centerCoord
      geom.setCoordinates(updated)
    }
    // For Polygon, update the last coordinate in the current ring
    else if (geom.getType() === 'Polygon') {
      const updated = coords.map((ring, ringIdx) => {
        if (ringIdx === 0) { // Only update first ring (exterior)
          const ringUpdated = [...ring]
          ringUpdated[ringUpdated.length - 1] = centerCoord
          return ringUpdated
        }
        return ring
      })
      geom.setCoordinates(updated)
    }
  }

  // --- Check if close enough to first vertex to close shape ---
  const isCloseToFirstVertex = (map, currentCoord, sketchCoords, geometryType) => {
    if (geometryType !== 'Polygon' || sketchCoords.length < 4) return false

    const firstCoord = sketchCoords[0]
    const currentPixel = coordToPixel(map, currentCoord)
    const firstPixel = coordToPixel(map, firstCoord)

    if (!currentPixel || !firstPixel) return false
    return pixelDist(currentPixel, firstPixel) < SNAP_TOLERANCE
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
      console.log('Polygon vertex count:', { ringLength: exteriorRing.length, numVertecies, ring: exteriorRing })
    } else if (geom.getType() === 'LineString') {
      // For LineString, OL stores coords with trailing rubber-band: [v1, v2, ..., vN, rubber]
      // Subtract 1 for the rubber-band coordinate
      numVertecies = Math.max(0, rawCoords.length - 1)
      console.log('LineString vertex count:', { coordsLength: rawCoords.length, numVertecies })
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
    if (document.activeElement !== container) return
    if (e.key === 'Enter') {
      e.preventDefault()
      interfaceType = 'keyboard'
      placeVertex()
    }
  }

  // Button click covers both Add Point button and any element inside it
  const onButtonClick = (e) => {
    if (addVertexButtonId && e.target.closest(`#${addVertexButtonId}`)) {
      placeVertex()
    }
  }

  // Track interface type so DrawMode can show/hide crosshair correctly
  const onPointerdown = (e) => {
    if (e.pointerType !== 'touch') {
      interfaceType = 'pointer'
    }
  }

  const onTouchstart = () => {
    interfaceType = 'touch'
  }

  // Update rubberbanding line as user moves around in keyboard/touch modes
  const onPointerMove = () => {
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
