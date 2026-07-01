import { coordToPixel, pixelDist } from '../utils/olCoords.js'

const SNAP_TOLERANCE = 12 // pixels
// Minimum ring length to allow snap-to-close (placed vertices + rubber-band)
const MIN_SKETCH_COORDS = { Polygon: 4, LineString: 3 }
const DUPLICATE_TOLERANCE_PX = 2
// OL Polygon ring layout after addToDrawing_: [...committed, rubber_band, closing_v1]
const POLY_COMMITTED_OFFSET = 3
const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])

const isCloseToFirstVertex = (map, coord, sketchCoords, geometryType) => {
  if (geometryType !== 'Polygon' || sketchCoords.length < MIN_SKETCH_COORDS.Polygon) {
    return false
  }
  const firstCoord = sketchCoords[0]
  const currentPixel = coordToPixel(map, coord)
  const firstPixel = coordToPixel(map, firstCoord)
  if (!currentPixel || !firstPixel) {
    return false
  }
  return pixelDist(currentPixel, firstPixel) < SNAP_TOLERANCE
}

const applyRubberbanding = (geom, centerCoord) => {
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

// Returns the last vertex committed by OL's Draw interaction (not the rubber-band or
// the closing copy that OL appends to Polygon rings).
const getLastCommittedVertex = (geom) => {
  if (geom.getType() === 'Polygon') {
    const ring = geom.getCoordinates()[0] || []
    return ring.length >= POLY_COMMITTED_OFFSET ? ring[ring.length - POLY_COMMITTED_OFFSET] : null
  }
  const coords = geom.getCoordinates()
  return coords.length >= 2 ? coords[coords.length - 2] : null
}

const wireInputEvents = ({
  container, addVertexButtonId, olView, onUndo,
  getInterfaceType, setInterfaceType, clearLastCoord,
  updateRubberbanding, placeVertex
}) => {
  const onCenterChange = () => {
    if (getInterfaceType() !== 'mouse') {
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

  return {
    destroy () {
      olView?.un('change:center', onCenterChange)
      globalThis.removeEventListener('keydown', onKeydown)
      globalThis.removeEventListener('click', onButtonClick)
      container.removeEventListener('pointerdown', onPointerdown)
      container.removeEventListener('touchstart', onTouchstart)
      container.removeEventListener('pointermove', onPointerMove)
    }
  }
}

export const createDrawInput = ({ drawInteraction, options }) => {
  const { container, addVertexButtonId, mapProvider, snap, onUndo, canFinish } = options
  let interfaceType = options.interfaceType ?? 'mouse'
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

  const updateRubberbanding = () => {
    if (!sketchFeature) {
      // No sketch yet — update snap indicator at crosshair position so targets are
      // visible before the first vertex is placed (touch/keyboard only; mouse uses
      // the OL snap interaction's pointermove handler instead).
      if (interfaceType !== 'mouse' && snap) {
        snap.apply(mapProvider.getCenter())
      }
      return
    }
    const geom = sketchFeature.getGeometry()
    const coords = geom.getCoordinates()
    if (!coords.length) {
      return
    }
    const raw = mapProvider.getCenter()
    const centerCoord = (interfaceType !== 'mouse' && snap) ? snap.apply(raw) : raw
    applyRubberbanding(geom, centerCoord)
  }

  // Returns true if the vertex was handled as a close/finish attempt (caller should not append).
  const tryClose = (geom, sketchCoords, coord) => {
    if (lastPlacedCoord && lastPlacedCoord[0] === coord[0] && lastPlacedCoord[1] === coord[1]) {
      // Same position as last placed: don't duplicate. Close only if enough real vertices exist.
      if (canFinish?.()) { drawInteraction.finishDrawing() }
      lastPlacedCoord = null
      return true
    }
    if (isCloseToFirstVertex(drawInteraction.getMap(), coord, sketchCoords, geom.getType())) {
      drawInteraction.finishDrawing()
      return true
    }
    // When the add-vertex button overlays the map (touch UI), OL's native pointer handler
    // and this button click handler both fire for the same tap. Detect that OL already
    // committed a vertex at coord's position and skip the duplicate appendCoordinates,
    // but register coord as lastPlacedCoord so a second tap at the same position can close.
    const map = drawInteraction.getMap()
    const lastCommitted = getLastCommittedVertex(geom)
    if (lastCommitted) {
      const p1 = map.getPixelFromCoordinate(lastCommitted)
      const p2 = map.getPixelFromCoordinate(coord)
      if (p1 && p2) {
        const dx = p1[0] - p2[0]; const dy = p1[1] - p2[1]
        if (dx * dx + dy * dy < DUPLICATE_TOLERANCE_PX * DUPLICATE_TOLERANCE_PX) {
          lastPlacedCoord = coord
          return true
        }
      }
    }
    return false
  }

  const placeVertex = () => {
    const raw = mapProvider.getCenter()
    const coord = (interfaceType !== 'mouse' && snap) ? snap.apply(raw) : raw
    snap?.hideIndicator()
    if (sketchFeature) {
      const geom = sketchFeature.getGeometry()
      const rawCoords = geom.getCoordinates()
      const sketchCoords = geom.getType() === 'Polygon' ? (rawCoords[0] || []) : rawCoords
      if (tryClose(geom, sketchCoords, coord)) { return }
    }
    drawInteraction.appendCoordinates([coord])
    lastPlacedCoord = coord
  }

  const map = drawInteraction.getMap()
  const olView = map?.getView()

  const events = wireInputEvents({
    container,
    addVertexButtonId,
    olView,
    onUndo,
    getInterfaceType: () => interfaceType,
    setInterfaceType: (t) => { interfaceType = t },
    clearLastCoord: () => { lastPlacedCoord = null },
    updateRubberbanding,
    placeVertex
  })

  // change:center fires once when a keyboard pan animation starts; postrender tracks each frame.
  const onMapRender = () => {
    if (interfaceType !== 'mouse' && olView?.getAnimating()) {
      updateRubberbanding()
    }
  }
  map?.on('postrender', onMapRender)

  return {
    getInterfaceType: () => interfaceType,
    destroy () {
      events.destroy()
      map?.un('postrender', onMapRender)
    }
  }
}
