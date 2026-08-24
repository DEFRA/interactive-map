import { groupIntoTabs } from './groupIntoTabs.js'

describe('groupIntoTabs', () => {
  it('returns null when there are no items', () => {
    expect(groupIntoTabs({ items: [], fallbackLabel: 'Panel' })).toBeNull()
  })

  it('returns null when all items share the same tab', () => {
    const items = [
      { id: 'a', order: 0, tab: 'Styles' },
      { id: 'b', order: 0, tab: 'Styles' }
    ]
    expect(groupIntoTabs({ items, fallbackLabel: 'Panel' })).toBeNull()
  })

  it('returns null when no items have a tab', () => {
    const items = [{ id: 'a', order: 0 }, { id: 'b', order: 0 }]
    expect(groupIntoTabs({ items, fallbackLabel: 'Panel' })).toBeNull()
  })

  it('partitions items into distinct tabs', () => {
    const items = [
      { id: 'a', order: 0, tab: 'Styles' },
      { id: 'b', order: 0, tab: 'Sizes' }
    ]
    const tabs = groupIntoTabs({ items, fallbackLabel: 'Panel' })
    expect(tabs.map(t => t.name).sort()).toEqual(['Sizes', 'Styles'])
  })

  it('groups untagged items into one fallback bucket named after fallbackLabel', () => {
    const items = [
      { id: 'a', order: 0, tab: 'Styles' },
      { id: 'b', order: 0 },
      { id: 'c', order: 0 }
    ]
    const tabs = groupIntoTabs({ items, fallbackLabel: 'Map styles' })
    const fallback = tabs.find(t => t.name === 'Map styles')
    expect(fallback.items.map(i => i.id).sort()).toEqual(['b', 'c'])
  })

  it('merges items whose tab differs only by case/whitespace into one bucket', () => {
    const items = [
      { id: 'a', order: 0, tab: 'Map Size' },
      { id: 'b', order: 1, tab: 'map size' },
      { id: 'c', order: 0, tab: 'Styles' }
    ]
    const tabs = groupIntoTabs({ items, fallbackLabel: 'Panel' })
    expect(tabs).toHaveLength(2)
    const merged = tabs.find(t => t.items.length === 2)
    expect(merged.items.map(i => i.id)).toEqual(expect.arrayContaining(['a', 'b']))
  })

  it("uses the winning (lowest-order) member's raw tab string as the displayed name", () => {
    const items = [
      { id: 'a', order: 2, tab: 'MAP SIZE' },
      { id: 'b', order: 1, tab: 'map size' }, // lower order wins the label
      { id: 'c', order: 0, tab: 'Styles' }
    ]
    const tabs = groupIntoTabs({ items, fallbackLabel: 'Panel' })
    const merged = tabs.find(t => t.items.length === 2)
    expect(merged.name).toBe('map size')
  })

  it("derives a tab's order from its first ordered member", () => {
    const items = [
      { id: 'a', order: 5, tab: 'Styles' },
      { id: 'b', order: 1, tab: 'Styles' },
      { id: 'c', order: 0, tab: 'Sizes' }
    ]
    const tabs = groupIntoTabs({ items, fallbackLabel: 'Panel' })
    const stylesTab = tabs.find(t => t.name === 'Styles')
    expect(stylesTab.order).toBe(1)
  })

  it('orders tabs among themselves using the derived order', () => {
    const items = [
      { id: 'a', order: 2, tab: 'Second' },
      { id: 'b', order: 1, tab: 'First' }
    ]
    const tabs = groupIntoTabs({ items, fallbackLabel: 'Panel' })
    expect(tabs.map(t => t.name)).toEqual(['First', 'Second'])
  })

  it('orders items within a tab using orderItems', () => {
    const items = [
      { id: 'a', order: 0, tab: 'Styles' },
      { id: 'b', order: 1, tab: 'Styles' },
      { id: 'c', order: 0, tab: 'Sizes' }
    ]
    const tabs = groupIntoTabs({ items, fallbackLabel: 'Panel' })
    const stylesTab = tabs.find(t => t.name === 'Styles')
    // b (order 1) is spliced ahead of the unordered item a
    expect(stylesTab.items.map(i => i.id)).toEqual(['b', 'a'])
  })
})
