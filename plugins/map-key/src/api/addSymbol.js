export const addSymbol = ({ pluginState: { dispatch } }, keyDefinition) => {
  dispatch({ type: 'ADD_KEY_SYMBOL', payload: keyDefinition })
}
