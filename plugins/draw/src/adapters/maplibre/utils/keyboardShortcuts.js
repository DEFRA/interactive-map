// Shared by editPointMode/keyboardHandlers.js and editVertexMode/keyboardHandlers.js — both
// modes gate their shortcuts on the same "is focus somewhere that should eat the keystroke"
// and "is this the undo chord" questions, independent of the ring-vs-single-coordinate
// bookkeeping the rest of each mode's keyboard handling differs on.
export const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
export const ARROW_OFFSETS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }

const INTERACTIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A'])

// Keyboard shortcuts are ignored while a form control outside the map viewport has
// focus, but still work for elements inside the viewport (e.g. draw toolbar buttons).
export const isInteractiveElementFocused = (state) => {
  const el = document.activeElement
  if (!el || el === document.body) { return false }
  if (state.container?.contains(el)) { return false }
  return INTERACTIVE_TAGS.has(el.tagName) || el.isContentEditable || el.hasAttribute('tabindex')
}

export const isUndoShortcut = (e) => e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey

// Mixin method — spread into both modes' keyboardHandlers so `this.handleUndo` resolves to
// whichever mode it's mixed into.
export const sharedKeyboardHandlers = {
  // Cmd/Ctrl+Z: undo the last edit, unless the user is typing in a text field.
  handleUndoShortcut (state, e) {
    const tag = document.activeElement?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    this.handleUndo(state)
  }
}
