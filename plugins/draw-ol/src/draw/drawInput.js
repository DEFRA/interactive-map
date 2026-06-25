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

const isCloseToFirstVertex = (map, coord, sketchCoords, geometryType) => {
  if (geometryType !== 'Polygon' || sketchCoords.length < 4) {
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

const wireInputEvents = ({
  container, addVertexButtonId, olView, onUndo,
  getInterfaceType, setInterfaceType, clearLastCoord,
  updateRubberbanding, placeVertex
}) => {
  const onCenterChange = () => {
    if (getInterfaceType() !== 'pointer') {
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
      setInterfaceType('pointer')
      clearLastCoord()
    }
  }

  const onTouchstart = () => {
    setInterfaceType('touch')
  }

  const onPointerMove = () => {
    if (getInterfaceType() === 'pointer') {
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

/**
 * @param {object} params
 * @param {import('ol/interaction/Draw').default} params.drawInteraction
 * @param {object} params.options - { container, interfaceType, addVertexButtonId, mapProvider, snap }
 * @returns {{ getInterfaceType: () => string, destroy: () => void }}
 */
export const createDrawInput = ({ drawInteraction, options }) => {
  const { container, addVertexButtonId, mapProvider, snap, onUndo } = options
  let interfaceType = options.interfaceType
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
      return
    }
    const geom = sketchFeature.getGeometry()
    const coords = geom.getCoordinates()
    if (!coords.length) {
      return
    }
    const raw = mapProvider.getCenter()
    const centerCoord = (interfaceType !== 'pointer' && snap) ? snap.apply(raw) : raw
    applyRubberbanding(geom, centerCoord)
  }

  const placeVertex = () => {
    const raw = mapProvider.getCenter()
    const coord = (interfaceType !== 'pointer' && snap) ? snap.apply(raw) : raw
    snap?.hideIndicator()
    if (sketchFeature) {
      const geom = sketchFeature.getGeometry()
      const rawCoords = geom.getCoordinates()
      const sketchCoords = geom.getType() === 'Polygon' ? (rawCoords[0] || []) : rawCoords
      if (lastPlacedCoord && lastPlacedCoord[0] === coord[0] && lastPlacedCoord[1] === coord[1]) {
        drawInteraction.finishDrawing()
        lastPlacedCoord = null
        return
      }
      if (isCloseToFirstVertex(drawInteraction.getMap(), coord, sketchCoords, geom.getType())) {
        drawInteraction.finishDrawing()
        return
      }
    }
    drawInteraction.appendCoordinates([coord])
    lastPlacedCoord = coord
  }

  const events = wireInputEvents({
    container,
    addVertexButtonId,
    olView: drawInteraction.getMap()?.getView(),
    onUndo,
    getInterfaceType: () => interfaceType,
    setInterfaceType: (t) => { interfaceType = t },
    clearLastCoord: () => { lastPlacedCoord = null },
    updateRubberbanding,
    placeVertex
  })

  return {
    getInterfaceType: () => interfaceType,
    destroy () {
      events.destroy()
    }
  }
}
