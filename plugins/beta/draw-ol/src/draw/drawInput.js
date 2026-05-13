/**
 * Input handling for draw mode: touch, keyboard, and button events.
 *
 * Mouse/pointer drawing is handled entirely by OL's Draw interaction.
 * This module handles the crosshair-based input path (touch + keyboard)
 * and the Done / Add Point / Cancel button wiring.
 */

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

  // --- Place a vertex at the current map center (crosshair position) ---
  const placeVertex = () => {
    const coord = mapProvider.getCenter()
    drawInteraction.appendCoordinates([coord])
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

  window.addEventListener('keydown', onKeydown)
  window.addEventListener('click', onButtonClick)
  container.addEventListener('pointerdown', onPointerdown)
  container.addEventListener('touchstart', onTouchstart, { passive: true })

  return {
    getInterfaceType: () => interfaceType,

    destroy () {
      window.removeEventListener('keydown', onKeydown)
      window.removeEventListener('click', onButtonClick)
      container.removeEventListener('pointerdown', onPointerdown)
      container.removeEventListener('touchstart', onTouchstart)
    }
  }
}
