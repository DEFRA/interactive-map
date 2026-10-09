import { getSnapInstance, clearSnapIndicator } from '../../utils/snapHelpers.js'
import { ARROW_KEYS, ARROW_OFFSETS, isInteractiveElementFocused, isUndoShortcut, sharedKeyboardHandlers } from '../../utils/keyboardShortcuts.js'
import { getCoords } from './geometryHelpers.js'
import { stopIfGlobalAltKey } from '../../../../../../../src/utils/globalAltShortcuts.js'

/**
 * Keyboard interaction for the vertex-edit mode: arrow-key vertex movement/insertion,
 * space-to-select, Escape, and Cmd/Ctrl+Z undo. Mixed into EditVertexMode.
 */
export const keyboardHandlers = {
  ...sharedKeyboardHandlers,

  onKeydown (state, event) {
    if (isInteractiveElementFocused(state)) {
      return
    }

    state.interfaceType = 'keyboard'
    this.hideTouchVertexIndicator(state)

    if (event.key === ' ') {
      this.handleSpace(state, event)
      return
    }
    if (ARROW_KEYS.has(event.key) && state.selectedVertexIndex >= 0) {
      this.handleArrowKey(state, event)
      return
    }
    if (event.key === 'Escape') {
      this.changeMode(state, { isPanEnabled: true, selectedVertexIndex: -1, selectedVertexType: null })
      return
    }
    if (isUndoShortcut(event)) {
      this.handleUndoShortcut(state, event)
    }
  },

  // Space always cancels the default; with no active selection it starts keyboard editing.
  handleSpace (state, event) {
    event.preventDefault()
    if (state.selectedVertexIndex < 0) {
      this.startKeyboardSelection(state)
    }
  },

  // Alt+arrow steps to the next vertex/midpoint; a plain arrow nudges the selected vertex.
  handleArrowKey (state, event) {
    event.preventDefault()
    event.stopPropagation()
    if (event.altKey) {
      this.updateVertex(state, event.key)
      return
    }
    this.moveVertexByKey(state, event)
  },

  // Space with no active selection: select the first vertex for keyboard editing.
  startKeyboardSelection (state) {
    const snap = getSnapInstance(this.map)
    if (snap) {
      clearSnapIndicator(snap, this.map)
    }
    if (!state.vertices?.length) {
      state.vertices = this.getVertices(state.featureId)
      state.midpoints = this.getMidpoints(state.featureId)
    }
    if (!state.vertices?.length) {
      return
    }
    state.isPanEnabled = false
    this.updateVertex(state)
  },

  // Arrow key with a selected vertex: insert (midpoint) or nudge the vertex, honouring snap.
  moveVertexByKey (state, event) {
    if (state.selectedVertexType === 'midpoint') {
      this.insertVertex(state, event)
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

    this.moveVertex(state, this._keyboardMoveTarget(state, event, currentCoord))
  },

  // Resolve the destination coordinate for a keyboard nudge, applying or breaking
  // snap — delegates to the shared resolver (utils/snapMovement.js) also used by
  // MapControls' nudgeVertexByDelta, so both snap identically.
  _keyboardMoveTarget (state, event, currentCoord) {
    const [dx, dy] = ARROW_OFFSETS[event.key]
    return this.resolveSnapTarget(state, dx, dy, currentCoord, () => this.getNewCoord(state, event))
  },

  onKeyup (state, event) {
    if (isInteractiveElementFocused(state)) {
      return
    }

    state.interfaceType = 'keyboard'
    // Only shadow while a vertex/midpoint is actually selected — that's the same condition
    // gating this mode's own local Alt+Arrow handling below (and there's no local Enter
    // meaning here at all, selected or not), so with nothing selected there's no local
    // conflict to protect and the global map-label shortcuts should keep working.
    if (state.selectedVertexIndex >= 0) {
      stopIfGlobalAltKey(event)
    }
    if (ARROW_KEYS.has(event.key) && state.selectedVertexIndex >= 0) {
      event.stopPropagation()

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
    if (event.key === 'Delete') {
      this.deleteVertex(state)
    }
  }
}
