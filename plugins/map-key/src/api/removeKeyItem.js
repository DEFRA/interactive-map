export const removeKeyItem = ({ pluginState: { dispatch } }, keyDefinition) => {
  dispatch({ type: 'REMOVE_KEY_ITEM', payload: keyDefinition })
}
