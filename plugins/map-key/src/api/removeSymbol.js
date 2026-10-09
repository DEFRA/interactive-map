export const removeSymbol = ({ pluginState: { dispatch } }, keyDefinition) => {
  dispatch({ type: 'REMOVE_KEY_SYMBOL', payload: keyDefinition })
}
