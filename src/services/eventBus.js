class EventBus {
  constructor () {
    this.events = {}
    this._queued = {}
  }

  /**
   * Register a handler for an event. If a value was queued via `emitWhenReady`
   * before any listeners existed, the handler is called immediately with that
   * value and the queue is cleared.
   *
   * @param {string} eventName
   * @param {Function} handler
   * @returns {this}
   */
  on (eventName, handler) {
    if (!this.events[eventName]) {
      this.events[eventName] = []
    }
    this.events[eventName].push(handler)

    if (this._queued[eventName] !== undefined) {
      try {
        handler(...this._queued[eventName])
      } catch (error) {
        console.error(`Error in event handler for '${eventName}':`, error)
      }
      delete this._queued[eventName]
    }

    return this
  }

  /**
   * Register a one-time handler that removes itself after the first call.
   *
   * @param {string} eventName
   * @param {Function} handler
   * @returns {this}
   */
  once (eventName, handler) {
    const wrapper = (...args) => {
      this.off(eventName, wrapper)
      handler(...args)
    }
    return this.on(eventName, wrapper)
  }

  /**
   * Remove a handler for an event. Omit `handler` to remove all handlers.
   *
   * @param {string} eventName
   * @param {Function} [handler]
   * @returns {this}
   */
  off (eventName, handler) {
    if (!this.events[eventName]) {
      return this
    }
    if (handler) {
      this.events[eventName] = this.events[eventName].filter(h => h !== handler)
    } else {
      this.events[eventName] = []
    }
    return this
  }

  /**
   * Emit an event, calling all registered handlers synchronously.
   *
   * @param {string} eventName
   * @param {...*} args
   * @returns {this}
   */
  emit (eventName, ...args) {
    if (!this.events[eventName]) {
      return this
    }

    this.events[eventName].forEach(handler => {
      try {
        handler(...args)
      } catch (error) {
        console.error(`Error in event handler for '${eventName}':`, error)
      }
    })
    return this
  }

  /**
   * Like `emit`, but queues the args if no listeners are registered yet.
   * The first listener to subscribe will receive the queued value immediately,
   * after which the queue is cleared. Subsequent `emitWhenReady` calls for the
   * same event before a listener arrives replace the queued value.
   *
   * Use this for events that may be emitted before the listener side is ready
   * (e.g. called from `map:ready` before React effects have run).
   *
   * @param {string} eventName
   * @param {...*} args
   * @returns {this}
   */
  emitWhenReady (eventName, ...args) {
    if (!this.events[eventName] || this.events[eventName].length === 0) {
      this._queued[eventName] = args
      return this
    }
    return this.emit(eventName, ...args)
  }

  /**
   * Like `emit`, but also registers a listener for the corresponding `Required` event.
   *
   * Use this for events that may be requested before or after the emitter side is ready
   * e.g. called from plugins that require a state reference from a different plugin like this:
   * const removeRegistryListener = eventBus.emitWhenRequested('datasets:registry', datasetRegistry)
   *
   * @param {string} eventName
   * @param {...*} args
   * @returns {Function} A function to remove the listener for the `Required` event.
   */
  emitWhenRequested (eventName, ...args) {
    const eventRequestedName = `${eventName}Requested`
    const eventReadyName = `${eventName}Ready`
    const handleOnRequired = () => this.emit(eventReadyName, ...args)
    // Add a listener that will emit the event whenever requested
    this.on(eventRequestedName, handleOnRequired)
    // Also emit the event immediately, in case a listener is already waiting for it
    handleOnRequired()
    return () => this.off(eventRequestedName, handleOnRequired)
  }

  /**
   * Like `emit`, but appends `Requested` to the event.
   * used for events that require a response from another plugin,
   * e.g. `datasets:registryRequested` will be emitted by the menu plugin,
   * via `eventBus.requestOnce('datasets:registry')`, and the datasets plugin will respond with `datasets:registryReady`.
   * and the datasets plugin will respond with `datasets:registryReady`.
   * via `eventBus.emitWhenRequested('datasets:registry', datasetRegistry)`.
   *
   * @param {string} eventName
   * @param {Function} eventHandler
   * @returns {this}
   */
  requestOnce (eventName, eventHandler) {
    const eventRequestedName = `${eventName}Requested`
    const eventReadyName = `${eventName}Ready`
    this.emit(eventRequestedName)
    this.once(eventReadyName, eventHandler)
    return this
  }

  /**
   * Remove all handlers and clear any queued events.
   */
  destroy () {
    this.events = {}
    this._queued = {}
  }
}

/**
 * Factory for map-local EventBus
 *
 * @returns {EventBus}
 */
export function createEventBus () {
  return new EventBus()
}

/**
 * Legacy singleton eventbus
 */

// Create singleton instance
const eventBus = new EventBus()

// Export singleton
export default eventBus
