import { mergeKeyGroupItems } from './mergeKeyGroupItems'

describe('mergeKeyGroupItems', () => {
  it('returns items unchanged when groups is not provided', () => {
    const items = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]

    expect(mergeKeyGroupItems(undefined, items)).toBe(items)
  })

  it('returns items unchanged when groups is null', () => {
    const items = [{ id: 'a', label: 'A' }]

    expect(mergeKeyGroupItems(null, items)).toBe(items)
  })

  it('merges matching group data into an item', () => {
    const items = [{ id: 'a', label: 'A' }]
    const groups = { a: { group: 'Group 1' } }

    expect(mergeKeyGroupItems(groups, items)).toEqual([
      { id: 'a', label: 'A', group: 'Group 1' }
    ])
  })

  it('overrides item properties with matching group properties', () => {
    const items = [{ id: 'a', label: 'A' }]
    const groups = { a: { label: 'Overridden' } }

    expect(mergeKeyGroupItems(groups, items)).toEqual([
      { id: 'a', label: 'Overridden' }
    ])
  })

  it('leaves items without a matching group unchanged', () => {
    const items = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]
    const groups = { a: { group: 'Group 1' } }

    expect(mergeKeyGroupItems(groups, items)).toEqual([
      { id: 'a', label: 'A', group: 'Group 1' },
      { id: 'b', label: 'B' }
    ])
  })

  it('returns an empty array when items is empty', () => {
    expect(mergeKeyGroupItems({ a: { group: 'Group 1' } }, [])).toEqual([])
  })

  it('handles an empty groups object as no matches', () => {
    const items = [{ id: 'a', label: 'A' }]

    expect(mergeKeyGroupItems({}, items)).toEqual(items)
  })
})
