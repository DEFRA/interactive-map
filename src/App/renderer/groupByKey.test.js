import { groupByKey } from './groupByKey.js'

describe('groupByKey', () => {
  it('returns one bucket per distinct key', () => {
    const items = [{ id: 'a', k: 'Styles' }, { id: 'b', k: 'Sizes' }]
    const buckets = groupByKey({ items, keyFn: item => item.k })
    expect([...buckets.keys()].sort()).toEqual(['sizes', 'styles'])
  })

  it('lowercases the key, hyphenating only camelCase-style boundaries (stringToKebab)', () => {
    const items = [{ id: 'a', k: 'mapSize' }]
    const buckets = groupByKey({ items, keyFn: item => item.k })
    expect([...buckets.keys()]).toEqual(['map-size'])
  })

  it('merges items whose key differs only by case/whitespace into one bucket', () => {
    const items = [{ id: 'a', k: 'Map Size' }, { id: 'b', k: 'map size' }]
    const buckets = groupByKey({ items, keyFn: item => item.k })
    expect(buckets.size).toBe(1)
    expect([...buckets.values()][0]).toHaveLength(2)
  })

  it('puts items with no key into one null-keyed bucket', () => {
    const items = [{ id: 'a' }, { id: 'b' }]
    const buckets = groupByKey({ items, keyFn: () => null })
    expect(buckets.size).toBe(1)
    expect(buckets.get(null)).toHaveLength(2)
  })

  it('keeps items within a bucket in their original relative order', () => {
    const items = [{ id: 'a', k: 'g' }, { id: 'b', k: 'g' }, { id: 'c', k: 'g' }]
    const buckets = groupByKey({ items, keyFn: item => item.k })
    expect(buckets.get('g').map(i => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('returns an empty map for an empty list', () => {
    expect(groupByKey({ items: [], keyFn: () => 'x' }).size).toBe(0)
  })
})
