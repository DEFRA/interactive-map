import { ARROW_KEYS, ARROW_OFFSETS, isInteractiveElementFocused, isUndoShortcut, sharedKeyboardHandlers } from '../../utils/keyboardShortcuts.js'

/**
 * Keyboard interaction for the point-edit mode: arrow-key/Shift+arrow nudge and Cmd/Ctrl+Z
 * undo. Mixed into EditPointMode. Unlike editVertexMode: the point is always selected (no
 * Space-to-select step, no Alt+arrow navigation — nothing to navigate to with one
 * coordinate), and Escape is deliberately left unbound here — deselecting would strand the
 * user with no way back except the Cancel button.
 */
export const keyboardHandlers = {
  ...sharedKeyboardHandlers,

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
  // delegates to the shared resolver (utils/snapMovement.js) also used by MoveControls'
  // nudgePointByDelta, so both snap identically.
  _keyboardMoveTarget (state, e, currentCoord) {
    const [dx, dy] = ARROW_OFFSETS[e.key]
    return this.resolveSnapTarget(state, dx, dy, currentCoord, () => this.getNewCoord(state, e))
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
