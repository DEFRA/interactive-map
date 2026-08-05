/**
 * Simple pub-sub event bus for plugin-internal communication.
 * Used to decouple components that need to communicate events.
 *
 * @returns {{on: Function, off: Function, emit: Function}}
 */
export const createEventBus = () => {
  const listeners = new Map()

  return {
    on (type, handler) {
      if (!listeners.has(type)) {
        listeners.set(type, new Set())
      }
      listeners.get(type).add(handler)
    },

    off (type, handler) {
      listeners.get(type)?.delete(handler)
    },

    emit (type, ...args) {
      const handlers = listeners.get(type)
      if (handlers) {
        // Array.from, not [...handlers] — under Docusaurus's docs build, Babel
        // compiles with `loose: true` (@docusaurus/babel/preset.js), which turns
        // spread-of-non-array-iterable into `[].concat(handlers)`. concat() only
        // flattens real arrays; for a Set it appends the whole Set as a single
        // element, so every handler call becomes `set.apply(...)` and throws
        // "h.apply is not a function". Array.from() is a plain function call, so
        // it's untouched by that transform and always iterates correctly.
        Array.from(handlers).forEach(h => h(...args))
      }
    }
  }
}
