const MAX_TAP_DURATION_MS = 300
const MAX_TAP_MOVEMENT_PX = 10

/**
 * Workaround: mapbox-gl-draw calls preventDefault() on touchend even in disabled
 * mode, which stops the browser synthesizing a click event. Detect quick taps
 * while in disabled mode and manually dispatch a click on the canvas so app-level
 * click handlers (e.g. feature selection) still fire.
 *
 * @param {Object} map - MapLibre map instance
 * @param {Object} draw - MapboxDraw instance (used to check the current mode)
 * @returns {{ remove: Function }}
 */
export const setupTouchClickWorkaround = (map, draw) => {
  const canvas = map.getCanvas()
  let touchStart = null

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() }
    }
  }

  const handleTouchEnd = (e) => {
    if (draw.getMode() !== 'disabled' || !touchStart) {
      touchStart = null
      return
    }

    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStart.x
    const dy = touch.clientY - touchStart.y
    const duration = Date.now() - touchStart.time

    // Only synthesize click for quick taps with minimal movement
    if (duration < MAX_TAP_DURATION_MS && Math.abs(dx) < MAX_TAP_MOVEMENT_PX && Math.abs(dy) < MAX_TAP_MOVEMENT_PX) {
      canvas.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: touch.clientX,
        clientY: touch.clientY
      }))
    }

    touchStart = null
  }

  canvas.addEventListener('touchstart', handleTouchStart, { passive: true })
  canvas.addEventListener('touchend', handleTouchEnd, { passive: true })

  return {
    remove () {
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  }
}
