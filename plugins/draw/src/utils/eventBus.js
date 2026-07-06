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
        [...handlers].forEach(h => h(...args))
      }
    }
  }
}
