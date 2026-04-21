export const datasetsToMenu = (state) => {
  const { datasets = [] } = state
  const menu = datasets
    .filter(dataset => dataset.showInMenu)
    .map(dataset => {
      if (dataset.sublayers?.length) {
        return {
          id: dataset.id,
          label: dataset.label,
          visibleWhen: true,
          type: 'checkbox',
          items: dataset.sublayers
            .filter(sublayer => sublayer.showInMenu)
            .map(sublayer => ({
              id: sublayer.id,
              label: sublayer.label,
              checked: sublayer.visibility !== 'hidden'
            }))
        }
      }
      return {
        type: 'divider',
        visibleWhen: true,
        items: [{
          id: dataset.id,
          label: dataset.label,
          checked: dataset.visibility !== 'hidden'
        }]
      }
    })
  return menu
}
