import { getSnapInstance, clearSnapIndicator } from '../../utils/snapHelpers.js'
import { ARROW_KEYS, ARROW_OFFSETS, isInteractiveElementFocused, isUndoShortcut, sharedKeyboardHandlers } from '../../utils/keyboardShortcuts.js'
import { getCoords } from './geometryHelpers.js'

/**
 * Keyboard interaction for the vertex-edit mode: arrow-key vertex movement/insertion,
 * space-to-select, Escape, and Cmd/Ctrl+Z undo. Mixed into EditVertexMode.
 */
export const keyboardHandlers = {
  ...sharedKeyboardHandlers,

  onKeydown (state, e) {
    if (isInteractiveElementFocused(state)) {
      return
    }

    state.interfaceType = 'keyboard'
    this.hideTouchVertexIndicator(state)

    if (e.key === ' ') {
      this.handleSpace(state, e)
      return
    }
    if (ARROW_KEYS.has(e.key) && state.selectedVertexIndex >= 0) {
      this.handleArrowKey(state, e)
      return
    }
    if (e.key === 'Escape') {
      this.changeMode(state, { isPanEnabled: true, selectedVertexIndex: -1, selectedVertexType: null })
      return
    }
    if (isUndoShortcut(e)) {
      this.handleUndoShortcut(state, e)
    }
  },

  // Space always cancels the default; with no active selection it starts keyboard editing.
  handleSpace (state, e) {
    e.preventDefault()
    if (state.selectedVertexIndex < 0) {
      this.startKeyboardSelection(state)
    }
  },

  // Alt+arrow steps to the next vertex/midpoint; a plain arrow nudges the selected vertex.
  handleArrowKey (state, e) {
    e.preventDefault()
    e.stopPropagation()
    if (e.altKey) {
      this.updateVertex(state, e.key)
      return
    }
    this.moveVertexByKey(state, e)
  },

  // Space with no active selection: select the first vertex for keyboard editing.
  startKeyboardSelection (state) {
    const snap = getSnapInstance(this.map)
    if (snap) {
      clearSnapIndicator(snap, this.map)
    }
    if (!state.vertecies?.length) {
      state.vertecies = this.getVerticies(state.featureId)
      state.midpoints = this.getMidpoints(state.featureId)
    }
    if (!state.vertecies?.length) {
      return
    }
    state.isPanEnabled = false
    this.updateVertex(state)
  },

  // Arrow key with a selected vertex: insert (midpoint) or nudge the vertex, honouring snap.
  moveVertexByKey (state, e) {
    if (state.selectedVertexType === 'midpoint') {
      this.insertVertex(state, e)
      return
    }

    const feature = this.getFeature(state.featureId)
    const currentCoord = feature && getCoords(feature)?.[state.selectedVertexIndex]
    if (!currentCoord) {
      return
    }

    // Save starting position for undo (only on first move of sequence)
    if (!state._keyboardMoveStartPosition) {
      state._keyboardMoveStartPosition = [...currentCoord]
      state._keyboardMoveStartIndex = state.selectedVertexIndex
    }

    this.moveVertex(state, this._keyboardMoveTarget(state, e, currentCoord))
  },

  // Resolve the destination coordinate for a keyboard nudge, applying or breaking
  // snap — delegates to the shared resolver (utils/snapMovement.js) also used by
  // MoveControls' nudgeVertexByDelta, so both snap identically.
  _keyboardMoveTarget (state, e, currentCoord) {
    const [dx, dy] = ARROW_OFFSETS[e.key]
    return this.resolveSnapTarget(state, dx, dy, currentCoord, () => this.getNewCoord(state, e))
  },

  onKeyup (state, e) {
    if (isInteractiveElementFocused(state)) {
      return
    }

    state.interfaceType = 'keyboard'
    if (ARROW_KEYS.has(e.key) && state.selectedVertexIndex >= 0) {
      e.stopPropagation()

      // Push undo for keyboard move sequence
      if (state._keyboardMoveStartPosition && state._keyboardMoveStartIndex != null) {
        this.pushUndo({
          type: 'move_vertex',
          featureId: state.featureId,
          vertexIndex: state._keyboardMoveStartIndex,
          previousPosition: state._keyboardMoveStartPosition
        })
        state._keyboardMoveStartPosition = null
        state._keyboardMoveStartIndex = null
      }
    }
    if (e.key === 'Delete') {
      this.deleteVertex(state)
    }
  }
}
