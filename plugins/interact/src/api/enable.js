/**
 * Programmatically enable interaction with options.
 *
 * @param {{ pluginState: { dispatch: Function } }} params
 * @param {Object} options
 */
import { DEFAULTS } from '../defaults.js'

export const enable = ({ pluginState, pluginConfig }, options) => {
  pluginState.dispatch({ type: 'ENABLE', payload: {
    ...DEFAULTS,
    ...pluginConfig,
    ...options
  }})
}
