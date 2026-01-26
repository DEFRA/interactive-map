export const disable = ({ pluginState }) => {
  pluginState.dispatch({ type: 'DISABLE' })
}
