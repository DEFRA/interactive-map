/**
 * Undo stack for draw operations.
 * Calls onChange(length) whenever the stack changes so the UI can update.
 *
 * @param {(length: number) => void} onChange
 */
export const createUndoStack = (onChange) => {
  const stack = []

  return {
    push (operation) {
      stack.push(operation)
      onChange(stack.length)
    },

    pop () {
      const op = stack.pop()
      onChange(stack.length)
      return op
    },

    clear () {
      stack.length = 0
      onChange(stack.length)
    },

    get length () {
      return stack.length
    }
  }
}
