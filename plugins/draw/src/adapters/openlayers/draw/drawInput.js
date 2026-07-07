import { createVertexPlacement } from './vertexPlacement.js'

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])

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

/**
 * Touch/keyboard input wiring for draw mode: crosshair vertex placement via the
 * add-vertex button or Enter, keyboard undo, interface-type tracking, and
 * rubber-band updates while the map pans under the crosshair.
 *
 * @returns {{ getInterfaceType: () => string, destroy: () => void }}
 */
export const createDrawInput = ({ drawInteraction, options }) => {
  const { container, addVertexButtonId, mapProvider, snap, onUndo, canFinish, canPlace } = options
  let interfaceType = options.interfaceType ?? 'mouse'
  const getInterfaceType = () => interfaceType

  const placement = createVertexPlacement({
    drawInteraction,
    mapProvider,
    snap,
    canFinish,
    canPlace,
    getInterfaceType
  })

  const map = drawInteraction.getMap()
  const olView = map?.getView()

  const events = wireInputEvents({
    container,
    addVertexButtonId,
    olView,
    onUndo,
    getInterfaceType,
    setInterfaceType: (t) => { interfaceType = t },
    clearLastCoord: placement.clearLastCoord,
    updateRubberbanding: placement.updateRubberbanding,
    placeVertex: placement.placeVertex
  })

  // change:center fires once when a keyboard pan animation starts; postrender tracks each frame.
  const onMapRender = () => {
    if (interfaceType !== 'mouse' && olView?.getAnimating()) {
      placement.updateRubberbanding()
    }
  }
  map?.on('postrender', onMapRender)

  return {
    getInterfaceType,
    destroy () {
      events.destroy()
      map?.un('postrender', onMapRender)
    }
  }
}
