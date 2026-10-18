// Use the live menu so runtime additions and removals are reflected in the UI.
export const hasLayersMenu = ({ pluginConfig, pluginState }) =>
  pluginConfig.hasMenu !== false && pluginState.menu.length > 0
