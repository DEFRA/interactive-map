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
 * @param {object} params.options - { container, interfaceType, addVertexButtonId, mapProvider, snap }
 * @returns {{ destroy: () => void }}
 */
export const createDrawInput = ({ drawInteraction, options }) => {
  const { container, addVertexButtonId, mapProvider, snap, onUndo } = options
  let interfaceType = options.interfaceType
  let map = null

  // Track the current sketch feature via draw events (OL 10 has no public getSketchFeature())
  let sketchFeature = null
  let lastPlacedCoord = null
  drawInteraction.on('drawstart', (e) => {
    sketchFeature = e.feature
    lastPlacedCoord = null
  })
  drawInteraction.on('drawend', () => {
    sketchFeature = null
    lastPlacedCoord = null
  })
  drawInteraction.on('drawabort', () => {
    sketchFeature = null
    lastPlacedCoord = null
  })

  // Get map reference — drawInteraction is already added to map before createDrawInput is called
  const getMap = () => {
    if (!map) {
      map = drawInteraction.getMap()
    }
    return map
  }

  // Listen to view centre changes for keyboard/touch rubberbanding.
  // pointermove alone won't fire when arrow keys pan the map.
  const onCenterChange = () => {
    if (interfaceType !== 'pointer') {
      updateSketchRubberbanding()
    }
  }

  const olMap = drawInteraction.getMap()
  const olView = olMap?.getView()
  if (olView) {
    olView.on('change:center', onCenterChange)
  }

  // --- Update sketch feature with current center (rubberbanding) ---
  const updateSketchRubberbanding = () => {
    if (!sketchFeature) {
      return
    }

    const geom = sketchFeature.getGeometry()
    const coords = geom.getCoordinates()
    if (coords.length === 0) {
      return
    }

    const raw = mapProvider.getCenter()
    const centerCoord = (interfaceType !== 'pointer' && snap) ? snap.apply(raw) : raw

    // For LineString, update the last (rubber-band) coordinate
    if (geom.getType() === 'LineString') {
      const updated = [...coords]
      updated[updated.length - 1] = centerCoord
      geom.setCoordinates(updated)
    } else if (geom.getType() === 'Polygon') {
      // For Polygon, update the last coordinate in the current ring
      const updated = coords.map((ring, ringIdx) => {
        if (ringIdx === 0) { // Only update first ring (exterior)
          const ringUpdated = [...ring]
          ringUpdated[ringUpdated.length - 1] = centerCoord
          return ringUpdated
        }
        return ring
      })
      geom.setCoordinates(updated)
    } else {
      // No action
    }
  }

  // --- Check if close enough to first vertex to close shape ---
  const isCloseToFirstVertex = (map, currentCoord, sketchCoords, geometryType) => {
    if (geometryType !== 'Polygon' || sketchCoords.length < 4) {
      return false
    }

    const firstCoord = sketchCoords[0]
    const currentPixel = coordToPixel(map, currentCoord)
    const firstPixel = coordToPixel(map, firstCoord)

    if (!currentPixel || !firstPixel) {
      return false
    }
    return pixelDist(currentPixel, firstPixel) < SNAP_TOLERANCE
  }

  // --- Place a vertex at the current map center (crosshair position) ---
  const placeVertex = () => {
    const raw = mapProvider.getCenter()
    const coord = (interfaceType !== 'pointer' && snap) ? snap.apply(raw) : raw
    snap?.hideIndicator()

    if (sketchFeature) {
      const geom = sketchFeature.getGeometry()
      const rawCoords = geom.getCoordinates()

      // For Polygon: rawCoords is array of rings, get exterior ring coords
      // For LineString: rawCoords is the coord array directly
      let sketchCoords = rawCoords
      if (geom.getType() === 'Polygon') {
        sketchCoords = rawCoords[0] || []
      }

      // Same position placed twice without moving → finish/close
      if (lastPlacedCoord && lastPlacedCoord[0] === coord[0] && lastPlacedCoord[1] === coord[1]) {
        drawInteraction.finishDrawing()
        lastPlacedCoord = null
        return
      }

      // Check if close to first vertex (for polygon closure)
      if (isCloseToFirstVertex(getMap(), coord, sketchCoords, geom.getType())) {
        drawInteraction.finishDrawing()
        return
      }
    }

    drawInteraction.appendCoordinates([coord])
    lastPlacedCoord = coord
  }

  // --- Event handlers ---
  const onKeydown = (e) => {
    if (!container.contains(document.activeElement)) {
      return
    }
    if (ARROW_KEYS.has(e.key)) {
      interfaceType = 'keyboard'
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      interfaceType = 'keyboard'
      placeVertex()
    }
    if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onUndo?.()
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
      lastPlacedCoord = null
    }
  }

  const onTouchstart = () => {
    interfaceType = 'touch'
  }

  const onPointerMove = () => {
    if (interfaceType === 'pointer') {
      return
    }
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
      if (olView) {
        olView.un('change:center', onCenterChange)
      }
      window.removeEventListener('keydown', onKeydown)
      window.removeEventListener('click', onButtonClick)
      container.removeEventListener('pointerdown', onPointerdown)
      container.removeEventListener('touchstart', onTouchstart)
      container.removeEventListener('pointermove', onPointerMove)
    }
  }
}
