/**
 * Creates an undo stack manager for draw operations.
 * Fires 'draw.undochange' events when stack changes for UI updates.
 *
 * @param {Object} map - MapLibre map instance
 * @returns {Object} Undo stack manager
 */
export const createUndoStack = (map) => {
  const stack = []

  const fireChange = () => {
    map.fire('draw.undochange', { length: stack.length })
  }

  return {
    push (operation) {
      stack.push(operation)
      fireChange()
    },

    pop () {
      const op = stack.pop()
      fireChange()
      return op
    },

    clear () {
      stack.length = 0
      fireChange()
    },

    get length () {
      return stack.length
    }
  }
}
