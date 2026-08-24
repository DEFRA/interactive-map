import { orderItems } from './orderItems.js'

describe('orderItems', () => {
  it('keeps unordered items in their natural sequence', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(orderItems(items).map(i => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('treats order 0 the same as no order', () => {
    const items = [{ id: 'a', order: 0 }, { id: 'b' }]
    expect(orderItems(items).map(i => i.id)).toEqual(['a', 'b'])
  })

  it('inserts an ordered item at its 1-based position among unordered items', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c', order: 1 }]
    expect(orderItems(items).map(i => i.id)).toEqual(['c', 'a', 'b'])
  })

  it('splices ordered items in ascending order, each relative to the growing result', () => {
    const items = [
      { id: 'a' },
      { id: 'b', order: 2 },
      { id: 'c', order: 1 }
    ]
    // c (order 1) is spliced in first, ahead of 'a': [c, a]
    // b (order 2) is then spliced at index 1 of that 2-item result: [c, b, a]
    expect(orderItems(items).map(i => i.id)).toEqual(['c', 'b', 'a'])
  })

  it('clamps an order larger than the list to the end', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c', order: 99 }]
    expect(orderItems(items).map(i => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('splices equal-order items each at position 0, reversing their relative order', () => {
    // The stable sort keeps a before b, but with no unordered items to anchor against,
    // each splice(0, 0, item) inserts ahead of the previous one.
    const items = [{ id: 'a', order: 1 }, { id: 'b', order: 1 }]
    expect(orderItems(items).map(i => i.id)).toEqual(['b', 'a'])
  })

  it('handles an all-ordered list', () => {
    const items = [{ id: 'a', order: 2 }, { id: 'b', order: 1 }]
    expect(orderItems(items).map(i => i.id)).toEqual(['b', 'a'])
  })

  it('handles an empty list', () => {
    expect(orderItems([])).toEqual([])
  })
})
