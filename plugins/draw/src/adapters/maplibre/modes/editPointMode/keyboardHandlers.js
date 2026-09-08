import { ARROW_KEYS, ARROW_OFFSETS, isInteractiveElementFocused, isUndoShortcut, sharedKeyboardHandlers } from '../../utils/keyboardShortcuts.js'
import { stopIfGlobalAltKey } from '../../../../../../../src/utils/globalAltShortcuts.js'

/**
 * Keyboard interaction for the point-edit mode: arrow-key/Shift+arrow nudge and Cmd/Ctrl+Z
 * undo. Mixed into EditPointMode. Unlike editVertexMode: the point is always selected (no
 * Space-to-select step, no Alt+arrow navigation — nothing to navigate to with one
 * coordinate), and Escape is deliberately left unbound here — deselecting would strand the
 * user with no way back except the Cancel button.
 */
export const keyboardHandlers = {
  ...sharedKeyboardHandlers,

  onKeydown (state, event) {
    if (isInteractiveElementFocused(state)) {
      return
    }

    state.interfaceType = 'keyboard'
    this.hideTouchPointIndicator(state)

    if (event.key === ' ') {
      // Prevent the page from scrolling; there's nothing to select, the point already is.
      event.preventDefault()
      return
    }
    if (ARROW_KEYS.has(event.key)) {
      this.handleArrowKey(state, event)
      return
    }
    if (isUndoShortcut(event)) {
      this.handleUndoShortcut(state, event)
    }
  },

  // A plain or Shift+arrow nudges the point (Shift's finer-step-vs-coarse-step distinction
  // lives in pointOperations.js's getOffset). Alt+arrow is left unhandled — nothing to
  // navigate to with a single coordinate.
  handleArrowKey (state, event) {
    event.preventDefault()
    event.stopPropagation()
    this.movePointByKey(state, event)
  },

  movePointByKey (state, event) {
    const currentCoord = this.getPointCoord(state)
    if (!currentCoord) {
      return
    }

    // Save starting position for undo (only on first move of a held-key sequence)
    if (!state._keyboardMoveStartPosition) {
      state._keyboardMoveStartPosition = [...currentCoord]
    }

    this.movePoint(state, this._keyboardMoveTarget(state, event, currentCoord))
  },

  // Resolve the destination coordinate for a keyboard nudge, applying or breaking snap —
  // delegates to the shared resolver (utils/snapMovement.js) also used by MoveControls'
  // nudgePointByDelta, so both snap identically.
  _keyboardMoveTarget (state, event, currentCoord) {
    const [dx, dy] = ARROW_OFFSETS[event.key]
    return this.resolveSnapTarget(state, dx, dy, currentCoord, () => this.getNewCoord(state, event))
  },

  onKeyup (state, event) {
    if (isInteractiveElementFocused(state)) {
      return
    }

    state.interfaceType = 'keyboard'
    stopIfGlobalAltKey(event)
    if (ARROW_KEYS.has(event.key)) {
      event.stopPropagation()

      // Push undo for the whole held-key move sequence as one step
      if (state._keyboardMoveStartPosition) {
        this.pushUndo({ type: 'move_point', featureId: state.featureId, vertexIndex: 0, previousPosition: state._keyboardMoveStartPosition })
        state._keyboardMoveStartPosition = null
      }
    }
  }
}
