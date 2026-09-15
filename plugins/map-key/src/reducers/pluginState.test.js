import { actions, initialState } from './pluginState.js'

describe('pluginState reducer helpers', () => {
  it('returns the initial state', () => {
    expect(initialState).toEqual({ keyDefinitions: [], groups: [] })
  })

  it('adds a flat key item and creates a flat group when needed', () => {
    const nextState = actions.ADD_KEY_SYMBOL(initialState, { id: 'flat-key', label: 'Flat key' })

    expect(nextState).toEqual({
      keyDefinitions: [{ id: 'flat-key', label: 'Flat key', type: 'manual' }],
      groups: [{ id: 'flat-key', type: 'flat' }]
    })
  })

  it('adds a grouped key item when the label can be converted to a group id', () => {
    const nextState = actions.ADD_KEY_SYMBOL(initialState, { id: 'group-key', groupLabel: 'Group Label', label: 'Group key' })

    expect(nextState).toEqual({
      keyDefinitions: [{
        id: 'group-key',
        groupId: 'group-label',
        groupLabel: 'Group Label',
        label: 'Group key',
        type: 'manual'
      }],
      groups: [{ id: 'group-label', type: 'group', groupLabel: 'Group Label' }]
    })
  })

  it('reuses an existing group when the key item matches a flat group already in state', () => {
    const state = {
      keyDefinitions: [{ id: 'existing-item' }],
      groups: [{ id: 'existing-item', type: 'flat' }]
    }

    expect(actions.ADD_KEY_SYMBOL(state, { id: 'existing-item', label: 'Existing item' })).toEqual({
      keyDefinitions: [
        { id: 'existing-item' },
        { id: 'existing-item', label: 'Existing item', type: 'manual' }
      ],
      groups: [{ id: 'existing-item', type: 'flat' }]
    })
  })

  it('reuses an existing grouped definition when the same group id is already present', () => {
    const state = {
      keyDefinitions: [{ id: 'existing-group-item', groupId: 'group-1' }],
      groups: [{ id: 'group-1', type: 'group', groupLabel: 'Group 1' }]
    }

    expect(actions.ADD_KEY_SYMBOL(state, { id: 'new-item', groupId: 'group-1', groupLabel: 'Group 1', label: 'New item' })).toEqual({
      keyDefinitions: [
        { id: 'existing-group-item', groupId: 'group-1' },
        { id: 'new-item', groupId: 'group-1', groupLabel: 'Group 1', label: 'New item', type: 'manual' }
      ],
      groups: [{ id: 'group-1', type: 'group', groupLabel: 'Group 1' }]
    })
  })

  it('removes a key definition by id', () => {
    const state = {
      keyDefinitions: [{ id: 'a' }, { id: 'b' }],
      groups: [{ id: 'a', type: 'flat' }]
    }

    expect(actions.REMOVE_KEY_SYMBOL(state, { id: 'a' })).toEqual({
      keyDefinitions: [{ id: 'b' }],
      groups: [{ id: 'a', type: 'flat' }]
    })
  })

  it('adds configured groups to state without mutating the source array', () => {
    const groups = [{ id: 'g1', type: 'group', groupLabel: 'G1' }]

    expect(actions.ADD_KEY_GROUPS(initialState, groups)).toEqual({
      keyDefinitions: [],
      groups: [{ id: 'g1', type: 'group', groupLabel: 'G1' }]
    })
  })
})
