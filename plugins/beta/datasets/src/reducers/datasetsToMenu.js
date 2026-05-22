export const datasetsToMenu = (state) => {
  const { datasets = [] } = state
  const menu = []
  const datasetsForMenu = datasets.filter(dataset => dataset.showInMenu)
  const groups = new Map()
  datasetsForMenu.forEach(dataset => {
    if (dataset.sublayers?.length) {
      menu.push({
        id: dataset.id,
        groupLabel: dataset.label,
        visibleWhen: true,
        type: 'checkbox',
        items: dataset.sublayers.filter(sublayer => sublayer.showInMenu)
          .map(sublayer => ({
            id: `${dataset.id}-${sublayer.id}`,
            label: sublayer.label
          }))
      })
    } else if (dataset.groupLabel) {
      // Check for existing group object for this groupLabel, or create it if it doesn't exist,
      // then add the dataset to its items and push it to the menu if it's new
      const groupObject = groups.has(dataset.groupLabel)
        ? groups.get(dataset.groupLabel)
        : {
            id: dataset.groupLabel,
            groupLabel: dataset.groupLabel,
            visibleWhen: true,
            type: 'checkbox',
            items: []
          }
      if (!groups.has(dataset.groupLabel)) {
        groups.set(dataset.groupLabel, groupObject)
        menu.push(groupObject)
      }
      // Then add this dataset to the groupObject's items
      groupObject.items.push({
        id: dataset.id,
        label: dataset.label
      })
    } else {
      menu.push({
        visibleWhen: true,
        type: 'checkbox',
        items: [
          {
            id: dataset.id,
            label: dataset.label
          }
        ]
      })
    }
  })
  return menu
}
