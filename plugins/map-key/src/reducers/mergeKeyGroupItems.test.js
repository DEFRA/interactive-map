import { attachPluginStateRef, mergeKeyGroupItems } from './mergeKeyGroupItems.js'

describe('mergeKeyGroupItems', () => {
  afterEach(() => {
    attachPluginStateRef({ current: null })
  })

  it('returns the incoming items unchanged when no plugin state is attached', () => {
    attachPluginStateRef({ current: null })
    const items = [{ id: 'dataset-1', keyDefinitions: [{ id: 'k1' }] }]

    expect(mergeKeyGroupItems(items)).toBe(items)
  })

  it('returns dataset items unchanged when plugin state groups are empty', () => {
    attachPluginStateRef({ current: { groups: [], keyDefinitions: [] } })
    const items = [{ id: 'dataset-1', keyDefinitions: [{ id: 'k1' }] }]

    expect(mergeKeyGroupItems(items)).toEqual(items)
  })

  it('uses default empty state values and empty arguments when no groups or items are supplied', () => {
    attachPluginStateRef({ current: {} })

    expect(mergeKeyGroupItems()).toEqual([])
  })

  it('merges a matched group even when the state group has no keyDefinitions array', () => {
    attachPluginStateRef({
      current: {
        groups: [{ id: 'dataset-1', type: 'group', groupLabel: 'Dataset 1' }],
        keyDefinitions: []
      }
    })

    const items = [{ id: 'dataset-1', keyDefinitions: [{ id: 'd1' }] }]

    expect(mergeKeyGroupItems(items)).toEqual([
      { id: 'dataset-1', type: 'group', groupLabel: 'Dataset 1', keyDefinitions: [{ id: 'd1' }] }
    ])
  })

  it('reuses the cached plugin-state groups when the ref object is unchanged', () => {
    const ref = { current: { groups: [{ id: 'group-1', type: 'group', groupLabel: 'Group 1' }], keyDefinitions: [{ id: 'k1', groupId: 'group-1' }] } }
    attachPluginStateRef(ref)

    const first = mergeKeyGroupItems([{ id: 'dataset-1', keyDefinitions: [{ id: 'd1' }] }])
    const second = mergeKeyGroupItems([{ id: 'dataset-1', keyDefinitions: [{ id: 'd2' }] }])

    expect(first).toEqual([{ id: 'group-1', type: 'group', groupLabel: 'Group 1', keyDefinitions: [{ id: 'k1', groupId: 'group-1' }] }])
    expect(second).toEqual(first)
  })

  it('merges a matching flat group into the dataset item when the key definition matches the same id', () => {
    attachPluginStateRef({
      current: {
        groups: [{ id: 'dataset-1', type: 'flat' }],
        keyDefinitions: [{ id: 'dataset-1' }]
      }
    })

    const items = [{ id: 'dataset-1', keyDefinitions: [{ id: 'dataset-1' }] }]

    expect(mergeKeyGroupItems(items)).toEqual([
      {
        id: 'dataset-1',
        type: 'flat',
        keyDefinition: { id: 'dataset-1' },
        keyDefinitions: [{ id: 'dataset-1' }]
      }
    ])
  })

  it('keeps only unmatched state groups that still have key definitions', () => {
    attachPluginStateRef({
      current: {
        groups: [
          { id: 'group-1', type: 'group', groupLabel: 'Group 1' },
          { id: 'group-2', type: 'group', groupLabel: 'Group 2' }
        ],
        keyDefinitions: [{ id: 'k1', groupId: 'group-1' }]
      }
    })

    const items = [{ id: 'dataset-1', keyDefinitions: [{ id: 'd1' }] }]

    expect(mergeKeyGroupItems(items)).toEqual([
      { id: 'group-1', type: 'group', groupLabel: 'Group 1', keyDefinitions: [{ id: 'k1', groupId: 'group-1' }] }
    ])
  })
})
