export const enable = ({ pluginState }, options) => {
  pluginState.dispatch({ type: 'ENABLE', payload: options })
}
