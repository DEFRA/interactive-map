/**
 * Programatically disable interactions.
 *
 * @param {Object} params
 * @param {{ dispatch: Function }} params.pluginState
 */
export const disable = ({ pluginState }) => {
  pluginState.dispatch({ type: 'DISABLE' })
}
