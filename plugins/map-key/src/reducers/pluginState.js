const initialState = {
  keyDefinitions: [],
  groups: []
}

const labelToId = (label) => label ? label.toLowerCase().replace(/\s+/g, '-') : null
const createNewGroup = (id, groupId, groupLabel) => {
  return groupId
    ? { id: groupId, type: 'group', groupLabel }
    : { id, type: 'flat' }
}

const findGroup = (state, id, groupId) => {
  return state.groups.find(group => {
    return (group.type === 'group' && group.id === groupId) ||
    (group.type === 'flat' && group.id === id)
  })
}

const addKeyItem = (state, keyDefinition) => {
  const { id, groupLabel } = keyDefinition
  const groupId = keyDefinition.groupId || labelToId(groupLabel)
  // Check for an existingGroup
  const existingGroup = findGroup(state, id, groupId)
  // If no existing group is found, create a new one
  const newGroup = existingGroup ? null : createNewGroup(id, groupId, groupLabel)
  // Add the new group to the state if it was created
  const groups = newGroup ? [...state.groups, newGroup] : state.groups
  // Add the key definition to the state
  const keyDefinitions = [...state.keyDefinitions, {
    ...keyDefinition,
    type: 'manual',
    ...(groupId ? { groupId } : {})
  }]

  // Return the updated state with the new key definitions and groups
  return {
    ...state,
    keyDefinitions,
    groups
  }
}

const removeKeyItem = (state, keyDefinition) => {
  const { id } = keyDefinition
  return {
    ...state,
    keyDefinitions: state.keyDefinitions.filter(key => key.id !== id)
  }
}

const addKeyGroups = (state, groups) => {
  return {
    ...state,
    groups: [...state.groups, ...groups]
  }
}

const actions = {
  ADD_KEY_ITEM: addKeyItem,
  REMOVE_KEY_ITEM: removeKeyItem,
  ADD_KEY_GROUPS: addKeyGroups
}

export {
  initialState,
  actions
}
