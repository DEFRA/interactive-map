export const datasetsToMenu = (state) => {
  const { datasets = [] } = state
  const menu = []
  const datasetsForMenu = datasets.filter(dataset =>
    dataset.showInMenu || dataset.sublayers?.some(s => s.showInMenu)
  )
  const groups = new Map()
  datasetsForMenu.forEach(dataset => {
    if (dataset.sublayers?.length) {
      const visibleSublayers = dataset.sublayers.filter(sublayer =>
        dataset.showInMenu ? sublayer.showInMenu !== false : sublayer.showInMenu
      )
      if (dataset.showInMenu === false && !visibleSublayers.length) {
        return
      }
      const groupObject = {
        id: dataset.id,
        groupLabel: dataset.label,
        visibleWhen: true,
        type: 'checkbox',
        items: visibleSublayers.map(sublayer => ({
          id: `${dataset.id}-${sublayer.id}`,
          label: sublayer.label
        }))
      }
      // Temporary change until we handle multiple datasets with sublayers, that have a groupLabel
      // So that the esri datasets with sublayers are displayed in the menu, even though they have a groupLabel
      if (groupObject.items.length === 0) {
        delete groupObject.groupLabel
        groupObject.items.push({
          id: dataset.id,
          label: dataset.label
        })
      }
      menu.push(groupObject)
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
        id: dataset.id,
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

export const addDatasetToMenu = (state, dataset) => {
  const menu = [...state.menu]
  const datasetMenuEntry = datasetsToMenu({ datasets: [dataset] })
  // For each entry in the new dataset menu, either add it to an existing group or add it as a new entry
  const existingGroup = menu.find(entry => entry.groupLabel === datasetMenuEntry[0].groupLabel)
  if (existingGroup) {
    existingGroup.items.push(...datasetMenuEntry[0].items)
  } else {
    menu.push(...datasetMenuEntry)
  }
  return menu
}

export const removeDatasetsFromMenu = (menu, datasetsToRemove) => {
  return menu.reduce((newMenu, menuGroup) => {
    const filteredItems = menuGroup.items.filter(item => !datasetsToRemove.includes(item.id))
    if (filteredItems.length) {
      newMenu.push({ ...menuGroup, items: filteredItems })
    }
    return newMenu
  }, [])
}
