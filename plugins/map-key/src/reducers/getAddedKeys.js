let _pluginStateRef = {}
export const attachPluginStateRef = (pluginStateRef) => { _pluginStateRef = pluginStateRef }

let previousRef = null
let addedKeyGroups = []

export const getAddedKeyGroups = () => {
  if (!_pluginStateRef?.current) return null
  if (previousRef === _pluginStateRef.current) {
    return addedKeyGroups
  }
  previousRef = _pluginStateRef.current
  const { groups, keyDefinitions } = _pluginStateRef.current

  addedKeyGroups = groups.map(group => {
    if (group.type === 'flat') {
      return {
        ...group,
        keyDefinition: keyDefinitions.find(item => item.id === group.id)
      }
    }

    return {
      ...group,
      keyDefinitions: keyDefinitions.filter(item => item.groupId === group.id)
    }
  })
  return addedKeyGroups
}

export const mergeKeyGroupItems = (datasetItems) => {
  const pluginConfigGroups = [...getAddedKeyGroups()]
  if (pluginConfigGroups?.length === 0) {
    return datasetItems
  }

  const mergedItems = datasetItems.map((item) => {
    const groupIndex = pluginConfigGroups.findIndex((_group) => _group.id === item.id)
    if (groupIndex === -1) {
      return item
    }
    // Remove the matched group from the pluginConfigGroups array and merge it with the item
    const group = pluginConfigGroups.splice(groupIndex, 1)[0]
    return { ...item, ...group, keyDefinitions: [...group.keyDefinitions, ...(item.keyDefinitions || [])] }
  })
  // Append any remaining pluginConfigGroups that were not matched with datasetItems
  const finalMergedItems = [...mergedItems, ...pluginConfigGroups]
    .filter(item =>
      ((item.type === 'flat' && item.keyDefinition) ||
      (item.type === 'group' && item.keyDefinitions?.length)))
  console.log('finalMergedItems', finalMergedItems)
  return finalMergedItems
}
