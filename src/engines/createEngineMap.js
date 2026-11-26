import CoreInteractiveMap from '../InteractiveMap/InteractiveMap.js'

/**
 * Creates the InteractiveMap class for an engine package, which creates its own engine's
 * provider instead of taking one. Engine-specific provider settings are passed as
 * `mapProviderOptions`.
 *
 * @param {(options?: Object) => Object} createProvider - The engine's provider factory.
 * @returns {typeof CoreInteractiveMap} The engine's InteractiveMap class.
 */
export const createEngineMap = (createProvider) => class InteractiveMap extends CoreInteractiveMap {
  /**
   * @param {string} id - The DOM element ID to mount the map into.
   * @param {Object} [options={}] - InteractiveMap options, plus `mapProviderOptions` for the engine.
   */
  constructor (id, { mapProviderOptions, ...options } = {}) {
    super(id, { ...options, mapProvider: createProvider(mapProviderOptions) })
  }
}
