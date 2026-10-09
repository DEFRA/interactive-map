// Alt+<key> keyup combos useKeyboardShortcuts.js binds globally (see keyboardMappings.js's
// `keyup` section) — a locally-focused context using the same combo must shadow it, or both
// fire. Single source of truth so a new global mapping is a visible prompt to check for that.
export const GLOBAL_ALT_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'])

// Call unconditionally from a local keyup handler while its scope is active — it only acts
// when the key is actually shadowed, so it's safe to call regardless of which key was pressed.
export const stopIfGlobalAltKey = (event) => {
  if (event.altKey && GLOBAL_ALT_KEYS.has(event.key)) {
    event.stopPropagation()
  }
}
