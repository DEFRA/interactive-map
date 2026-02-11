// Remove attributes from <canvas/> as this can't be done through API
export function cleanCanvas (map) {
  const canvas = map.getCanvas()
  canvas.removeAttribute('role')
  canvas.setAttribute('tabindex', -1) // If removed altogether Chrome can add a focus-visible style
  canvas.removeAttribute('aria-label')
  canvas.style.display = 'block'
}

// Fix touch preventDefault console error
export function applyPreventDefaultFix (map) {
  // Store original preventDefault
  const originalPreventDefault = Event.prototype.preventDefault

  // Override preventDefault only for events targeting our map
  Event.prototype.preventDefault = function () { // NOSONAR: intentional monkey-patch to fix MapLibre touch event bug
    if ((this.type === 'touchmove' || this.type === 'touchstart') && !this.cancelable) {
      // Check if the event target is within our map container
      const canvas = map.getCanvas()
      if (canvas && (this.target === canvas || canvas.contains(this.target))) {
        return
      }
    }
    originalPreventDefault.call(this)
  }
}
