// Remove attributes from <canvas/> as this can't be done through API
export function cleanCanvas (map) {
  const canvas = map.getCanvas()
  canvas.removeAttribute('role')
  canvas.setAttribute('tabindex', -1) // If removed altogether Chrome can add a focus-visible style
  canvas.removeAttribute('aria-label')
  canvas.style.display = 'block'
  // The map container is aria-hidden, but MapLibre's canvas inside it can still
  // receive focus, triggering: "Blocked aria-hidden on an element because its
  // descendant retained focus." Immediately blurring and returning focus to
  // relatedTarget prevents the canvas from holding focus inside an aria-hidden subtree.
  canvas.addEventListener('focus', (event) => { // NOSONAR
    canvas.blur()
    if (event.relatedTarget) {
      event.relatedTarget.focus({ preventScroll: true })
    }
  })
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
