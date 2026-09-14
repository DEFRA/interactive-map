const initialState = {
  keyDefinitions: [{
    id: 'test-key-item',
    label: 'Test Key',
    groupId: 'test-key-group',
    type: 'manual',
    hasSymbol: false,
    hasPattern: false,
    style: {
      strokeWidth: 2,
      fill: { outdoor: '#1d70b8', dark: '#7fcdbb' },
      stroke: { outdoor: '#1d70b8', dark: '#7fcdbb' }
    },
    symbolDescription: 'A test key item'
  }],
  groups: [{
    id: 'test-key-group',
    type: 'group',
    groupLabel: 'Test Key Group'
  }]
}

const labelToId = (label) => label ? label.toLowerCase().replace(/\s+/g, '-') : null
const createNewGroup = (id, groupId, groupLabel) => {
  return groupId
    ? { id: groupId, type: 'group', label: groupLabel }
    : { id, type: 'flat' }
}

const addKeyItem = (state, keyDefinition) => {
  const { id, groupLabel } = keyDefinition
  const groupId = labelToId(groupLabel)
  const existingGroup = groupId && state.groups.find(group => group.id === groupId)
  const newGroup = existingGroup ? null : createNewGroup(id, groupId, groupLabel)
  const groups = newGroup ? [...state.groups, newGroup] : state.groups
  return {
    ...state,
    keyDefinitions: [...state.keyDefinitions, keyDefinition],
    groups
  }
}

const addKeyGroups = (state, groups) => {
  return {
    ...state,
    groups: [...state.groups, ...groups]
  }
}

const removeKeyItem = (state, keyDefinition) => {
  const { id } = keyDefinition
  return {
    ...state,
    keyDefinitions: state.keyDefinitions.filter(key => key.id !== id)
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
