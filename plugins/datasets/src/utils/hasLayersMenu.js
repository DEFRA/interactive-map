export const hasLayersMenu = ({ pluginConfig, pluginState }) => {
  if (pluginConfig.hasMenu === false) return false

  // Before initialisation the live menu is empty, so use the configured datasets.
  // Once initialised, an empty live menu also covers removal of the last dataset.
  return pluginState.menuInitialised
    ? pluginState.menu.length > 0
    : (pluginConfig.datasets || []).some(dataset =>
        dataset.showInMenu || dataset.sublayers?.some(sublayer => sublayer.showInMenu)
      )
}
