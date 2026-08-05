import { findNearest } from './vertexHitTest.js'

/**
 * Pointer/mouse selection handlers for edit mode, plus the global
 * delete-vertex button listener.
 *
 * Interface-type flips here mutate state directly (not via setState) because
 * switching device must not touch the current selection.
 *
 * @returns {{ destroy: () => void }}
 */
export const createPointerHandlers = ({ map, container, getState, setState, touchHandler, deleteVertexButtonId, onDeleteVertex }) => {
  const hitAt = (e) => {
    const { vertices, midpoints } = getState()
    const olPixel = map.getEventPixel(e)
    return findNearest(map, vertices, midpoints, { x: olPixel[0], y: olPixel[1] })
  }

  const onPointerdown = (e) => {
    const state = getState()
    if (e.pointerType === 'touch') {
      state.interfaceType = 'touch'
      touchHandler.updateTargetPosition()
      return
    }
    state.interfaceType = 'mouse'
    const hit = hitAt(e)
    if (hit?.type === 'vertex') {
      setState({ selectedVertexIndex: hit.index, selectedVertexType: 'vertex' })
    }
  }

  // click fires after OL Modify finishes, so state.vertices reflects any insertions/moves
  const onContainerClick = (e) => {
    if (getState().interfaceType === 'touch') {
      return
    }
    const hit = hitAt(e)
    if (hit?.type === 'vertex') {
      setState({ selectedVertexIndex: hit.index, selectedVertexType: 'vertex' })
    } else if (hit?.type === 'midpoint') {
      // modifyend already selected the inserted vertex — nothing to do here
    } else {
      setState({ selectedVertexIndex: -1, selectedVertexType: null })
    }
  }

  // Switch to pointer mode and hide the touch target as soon as the mouse moves
  const onPointerMove = (e) => {
    const state = getState()
    if (e.pointerType !== 'mouse' || state.interfaceType === 'mouse') {
      return
    }
    state.interfaceType = 'mouse'
    touchHandler.hide()
  }

  const onButtonClick = (e) => {
    if (deleteVertexButtonId && e.target.closest(`#${deleteVertexButtonId}`)) {
      onDeleteVertex()
    }
  }

  container.addEventListener('pointerdown', onPointerdown)
  container.addEventListener('pointerenter', onPointerMove)
  container.addEventListener('pointermove', onPointerMove)
  container.addEventListener('click', onContainerClick)
  globalThis.addEventListener('click', onButtonClick)

  return {
    destroy () {
      container.removeEventListener('pointerdown', onPointerdown)
      container.removeEventListener('pointerenter', onPointerMove)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('click', onContainerClick)
      globalThis.removeEventListener('click', onButtonClick)
    }
  }
}
