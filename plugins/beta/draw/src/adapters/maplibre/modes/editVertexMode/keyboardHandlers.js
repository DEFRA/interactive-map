import {
  getSnapInstance, isSnapActive, isSnapEnabled, getSnapLngLat,
  getSnapRadius, triggerSnapAtPoint, clearSnapIndicator
} from '../../utils/snapHelpers.js'
import { getCoords } from './geometryHelpers.js'

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
const ARROW_OFFSETS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }
const INTERACTIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A'])

// Keyboard shortcuts are ignored while a form control outside the map viewport has
// focus, but still work for elements inside the viewport (e.g. draw toolbar buttons).
const isInteractiveElementFocused = (state) => {
  const el = document.activeElement
  if (!el || el === document.body) { return false }
  if (state.container?.contains(el)) { return false }
  return INTERACTIVE_TAGS.has(el.tagName) || el.isContentEditable || el.hasAttribute('tabindex')
}

const isUndoShortcut = (e) => e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey

/**
 * Keyboard interaction for the vertex-edit mode: arrow-key vertex movement/insertion,
 * space-to-select, Escape, and Cmd/Ctrl+Z undo. Mixed into EditVertexMode.
 */
export const keyboardHandlers = {
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

  // Resolve the destination coordinate for a keyboard nudge, applying or breaking snap.
  _keyboardMoveTarget (state, e, currentCoord) {
    const snap = getSnapInstance(this.map)

    // Break out of an active snap by moving beyond the snap radius
    if (isSnapEnabled(state) && state._isSnapped && snap) {
      const offset = getSnapRadius(snap) + 1
      const pt = this.map.project(currentCoord)
      const [dx, dy] = ARROW_OFFSETS[e.key].map(v => v * offset)
      state._isSnapped = false
      clearSnapIndicator(snap, this.map)
      return this.map.unproject({ x: pt.x + dx, y: pt.y + dy })
    }

    const newCoord = this.getNewCoord(state, e)
    if (isSnapEnabled(state) && snap) {
      triggerSnapAtPoint(snap, this.map, this.map.project(newCoord))
      if (isSnapActive(snap)) {
        state._isSnapped = true
        return getSnapLngLat(snap)
      }
    }
    state._isSnapped = false
    return newCoord
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
