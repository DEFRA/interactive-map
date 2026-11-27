import { mergeKeyGroupItems } from './mergeKeyGroupItems.js'

describe('mergeKeyGroupItems', () => {
  it('returns the incoming items unchanged when no plugin state is passed', () => {
    const items = [{ id: 'dataset-1', keyDefinitions: [{ id: 'k1' }] }]

    expect(mergeKeyGroupItems(items)).toBe(items)
  })

  it('returns dataset items unchanged when plugin state groups are empty', () => {
    const pluginState = { groups: [], keyDefinitions: [] }
    const items = [{ id: 'dataset-1', keyDefinitions: [{ id: 'k1' }] }]

    expect(mergeKeyGroupItems(items, pluginState)).toEqual(items)
  })

  it('uses default empty state values and empty arguments when no groups or items are supplied', () => {
    const pluginState = {}

    expect(mergeKeyGroupItems(undefined, pluginState)).toEqual([])
  })

  it('merges a matched group even when the state group has no keyDefinitions array', () => {
    const pluginState = {
      groups: [{ id: 'dataset-1', type: 'group', groupLabel: 'Dataset 1' }],
      keyDefinitions: []
    }

    const items = [{ id: 'dataset-1', keyDefinitions: [{ id: 'd1' }] }]

    expect(mergeKeyGroupItems(items, pluginState)).toEqual([
      { id: 'dataset-1', type: 'group', groupLabel: 'Dataset 1', keyDefinitions: [{ id: 'd1' }] }
    ])
  })

  it('merges a matched group even when the incoming item has no keyDefinitions array', () => {
    const pluginState = {
      groups: [{ id: 'group-1', type: 'group', groupLabel: 'Group 1' }],
      keyDefinitions: [{ id: 'k1', groupId: 'group-1' }]
    }

    const items = [{ id: 'group-1' }]

    expect(mergeKeyGroupItems(items, pluginState)).toEqual([
      { id: 'group-1', type: 'group', groupLabel: 'Group 1', keyDefinitions: [{ id: 'k1', groupId: 'group-1' }] }
    ])
  })

  it('uses only the plugin state it is given, so each map keeps its own groups', () => {
    const mapAState = { groups: [{ id: 'group-a', type: 'group', groupLabel: 'Group A' }], keyDefinitions: [{ id: 'a1', groupId: 'group-a' }] }
    const mapBState = { groups: [{ id: 'group-b', type: 'group', groupLabel: 'Group B' }], keyDefinitions: [{ id: 'b1', groupId: 'group-b' }] }

    expect(mergeKeyGroupItems([], mapAState)).toEqual([{ id: 'group-a', type: 'group', groupLabel: 'Group A', keyDefinitions: [{ id: 'a1', groupId: 'group-a' }] }])
    expect(mergeKeyGroupItems([], mapBState)).toEqual([{ id: 'group-b', type: 'group', groupLabel: 'Group B', keyDefinitions: [{ id: 'b1', groupId: 'group-b' }] }])
  })

  it('merges a matching flat group into the dataset item when the key definition matches the same id', () => {
    const pluginState = {
      groups: [{ id: 'dataset-1', type: 'flat' }],
      keyDefinitions: [{ id: 'dataset-1' }]
    }

    const items = [{ id: 'dataset-1', keyDefinitions: [{ id: 'dataset-1' }] }]

    expect(mergeKeyGroupItems(items, pluginState)).toEqual([
      {
        id: 'dataset-1',
        type: 'flat',
        keyDefinition: { id: 'dataset-1' },
        keyDefinitions: [{ id: 'dataset-1' }]
      }
    ])
  })

  it('keeps only unmatched state groups that still have key definitions', () => {
    const pluginState = {
      groups: [
        { id: 'group-1', type: 'group', groupLabel: 'Group 1' },
        { id: 'group-2', type: 'group', groupLabel: 'Group 2' }
      ],
      keyDefinitions: [{ id: 'k1', groupId: 'group-1' }]
    }

    const items = [{ id: 'dataset-1', keyDefinitions: [{ id: 'd1' }] }]

    expect(mergeKeyGroupItems(items, pluginState)).toEqual([
      { id: 'group-1', type: 'group', groupLabel: 'Group 1', keyDefinitions: [{ id: 'k1', groupId: 'group-1' }] }
    ])
  })
})
