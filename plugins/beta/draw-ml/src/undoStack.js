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
    /**
     * Push an undo operation onto the stack
     * @param {Object} operation - { type, undo: Function, ...data }
     */
    push(operation) {
      stack.push(operation)
      fireChange()
    },

    /**
     * Pop and return the last operation (does not execute it)
     * @returns {Object|undefined} The operation or undefined if empty
     */
    pop() {
      const op = stack.pop()
      fireChange()
      return op
    },

    /**
     * Clear all operations from the stack
     */
    clear() {
      stack.length = 0
      fireChange()
    },

    /**
     * Get current stack length
     */
    get length() {
      return stack.length
    }
  }
}
