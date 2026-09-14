let _pluginStateRef = {}
export const attachPluginStateRef = (pluginStateRef) => { _pluginStateRef = pluginStateRef }

let previousRef = null
let addedKeyGroups = []

const getStateKeyGroups = () => {
  if (!_pluginStateRef?.current) return []
  if (previousRef === _pluginStateRef.current) {
    return addedKeyGroups
  }
  previousRef = _pluginStateRef.current
  const { groups = [], keyDefinitions = [] } = _pluginStateRef.current

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

// Merges the state key group items with items provided by another plugin,
// specifically the datasets plugin
export const mergeKeyGroupItems = (keyGroupItemsToMerge = []) => {
  // Clone the current state key groups from the plugin state reference
  // to avoid mutating the original array
  const stateKeyGroups = [...getStateKeyGroups()]
  if (stateKeyGroups.length === 0) {
    // if there is nothing in the state key groups, just return the items that were passed in
    return keyGroupItemsToMerge
  }

  const mergedItems = keyGroupItemsToMerge.map((keyGroupItem) => {
    const groupIndex = stateKeyGroups.findIndex((_group) => _group.id === keyGroupItem.id)
    if (groupIndex === -1) {
      return keyGroupItem
    }
    // Splice the matched group from the stateKeyGroups and merge it with the item
    const group = stateKeyGroups.splice(groupIndex, 1)[0]
    return {
      ...keyGroupItem,
      ...group,
      keyDefinitions: [
        ...group.keyDefinitions,
        ...(keyGroupItem.keyDefinitions || [])
      ]
    }
  })

  // Append any remaining pluginConfigGroups that were not matched with datasetItems
  // and filter out any groups that have no key definitions
  const finalMergedItems = [...mergedItems, ...stateKeyGroups]
    .filter(item =>
      ((item.type === 'flat' && item.keyDefinition) ||
      (item.type === 'group' && item.keyDefinitions?.length)))
  return finalMergedItems
}
