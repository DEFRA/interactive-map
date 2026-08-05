/**
 * Keyboard handling for the shared draw mode: cmd/ctrl+z undo, arrow/Enter keyboard
 * drawing, and Escape cancel/reinitialise. Part of createDrawMode.
 *
 * Note the two distinct handlers: onKeyup (lowercase) is a window listener; onKeyUp
 * (capital U) is mapbox-gl-draw's own, registered on the container.
 */
export const createKeyboardHandlers = ({ ParentMode, getFeature, INTERFACE_KEYS }) => ({
  onKeydown (state, e) {
    if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      this._handleUndoKeydown(state, e)
      return
    }
    if (document.activeElement !== state.container) {
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      return
    }
    if (e.key === 'Enter') {
      state.isActive = true
    }
    if (!INTERFACE_KEYS.has(e.key)) {
      return
    }
    this._setInterface(state, 'keyboard')
    this.onMove(state, e)
  },

  onKeyup (state, e) {
    if (e.key === 'Escape') {
      if (state.interfaceType !== 'keyboard') {
        // Mouse/touch: cancel drawing — onKeyUp (capital U) won't fire since container isn't focused
        this.map.fire('draw.cancel')
      }
      // Keyboard: onKeyUp (capital U) handles reinitialize (container is focused, event reaches it)
      return
    }
    if (document.activeElement !== state.container) {
      return
    }
    if (!INTERFACE_KEYS.has(e.key)) {
      return
    }
    this._setInterface(state, 'keyboard')
    this.onMove(state, e)
    if (e.key === 'Enter' && state.isActive) {
      this.doClick(state)
    }
  },

  // Called by mapbox-gl-draw's event system (capital U — distinct from onKeyup above).
  // Registered on ctx.container, so only fires when the viewport has focus (keyboard drawing).
  //   1. A UI element inside the viewport has focus (e.g. popup menu) → ignore, let React handle
  //   2. Keyboard drawing (container focused, interfaceType === 'keyboard') → Escape restarts
  //   3. Non-keyboard with container focused → skip (already handled by window onKeyup via draw.cancel)
  onKeyUp (state, e) {
    const activeEl = document.activeElement
    if (activeEl && activeEl !== state.container && state.container.contains(activeEl)) {
      return
    }
    if (e.key === 'Escape') {
      if (state.interfaceType === 'keyboard') {
        const undoStack = this.map._undoStack
        if (undoStack) {
          undoStack.clear()
        }
        this._reinitializeFeature(state, getFeature(state))
      }
      // Non-keyboard already handled by onKeyup (window) via draw.cancel
      return
    }
    if (activeEl !== state.container) {
      ParentMode.onKeyUp.call(this, state, e)
    }
  }
})
