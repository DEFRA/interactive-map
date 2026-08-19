const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
const ARROW_OFFSETS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }
const INTERACTIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A'])

// Keyboard shortcuts are ignored while a form control outside the map viewport has
// focus, but still work for elements inside the viewport (e.g. draw toolbar buttons).
// Copied verbatim from editVertexMode/keyboardHandlers.js — this, and the window-level
// {capture:true} binding in editPointMode.js, is what makes arrows work regardless of
// which interface type is currently active (see editPointMode.js's own comment).
const isInteractiveElementFocused = (state) => {
  const el = document.activeElement
  if (!el || el === document.body) { return false }
  if (state.container?.contains(el)) { return false }
  return INTERACTIVE_TAGS.has(el.tagName) || el.isContentEditable || el.hasAttribute('tabindex')
}

const isUndoShortcut = (e) => e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey

/**
 * Keyboard interaction for the point-edit mode: arrow-key/Shift+arrow nudge and Cmd/Ctrl+Z
 * undo. Mixed into EditPointMode. Unlike editVertexMode: the point is always selected (no
 * Space-to-select step, no Alt+arrow navigation — nothing to navigate to with one
 * coordinate), and Escape is deliberately left unbound here — deselecting would strand the
 * user with no way back except the Cancel button.
 */
export const keyboardHandlers = {
  onKeydown (state, e) {
    if (isInteractiveElementFocused(state)) {
      return
    }

    state.interfaceType = 'keyboard'
    this.hideTouchPointIndicator(state)

    if (e.key === ' ') {
      // Prevent the page from scrolling; there's nothing to select, the point already is.
      e.preventDefault()
      return
    }
    if (ARROW_KEYS.has(e.key)) {
      this.handleArrowKey(state, e)
      return
    }
    if (isUndoShortcut(e)) {
      this.handleUndoShortcut(state, e)
    }
  },

  // A plain or Shift+arrow nudges the point (Shift's finer-step-vs-coarse-step distinction
  // lives in pointOperations.js's getOffset). Alt+arrow is left unhandled — nothing to
  // navigate to with a single coordinate.
  handleArrowKey (state, e) {
    e.preventDefault()
    e.stopPropagation()
    this.movePointByKey(state, e)
  },

  movePointByKey (state, e) {
    const currentCoord = this.getPointCoord(state)
    if (!currentCoord) {
      return
    }

    // Save starting position for undo (only on first move of a held-key sequence)
    if (!state._keyboardMoveStartPosition) {
      state._keyboardMoveStartPosition = [...currentCoord]
    }

    this.movePoint(state, this._keyboardMoveTarget(state, e, currentCoord))
  },

  // Resolve the destination coordinate for a keyboard nudge, applying or breaking snap —
  // delegates to the shared resolver (pointOperations.js) also used by MoveControls'
  // nudgePointByDelta, so both snap identically.
  _keyboardMoveTarget (state, e, currentCoord) {
    const [dx, dy] = ARROW_OFFSETS[e.key]
    return this.resolveSnapTarget(state, dx, dy, currentCoord, () => this.getNewCoord(state, e))
  },

  // Cmd/Ctrl+Z: undo the last edit, unless the user is typing in a text field.
  handleUndoShortcut (state, e) {
    const tag = document.activeElement?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    this.handleUndo(state)
  },

  onKeyup (state, e) {
    if (isInteractiveElementFocused(state)) {
      return
    }

    state.interfaceType = 'keyboard'
    if (ARROW_KEYS.has(e.key)) {
      e.stopPropagation()

      // Push undo for the whole held-key move sequence as one step
      if (state._keyboardMoveStartPosition) {
        this.pushUndo({ type: 'move_point', featureId: state.featureId, vertexIndex: 0, previousPosition: state._keyboardMoveStartPosition })
        state._keyboardMoveStartPosition = null
      }
    }
  }
}
