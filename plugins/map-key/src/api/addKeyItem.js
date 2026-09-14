export const addKeyItem = ({ pluginState: { dispatch } }, keyDefinition) => {
  dispatch({ type: 'ADD_KEY_ITEM', payload: keyDefinition })
}
