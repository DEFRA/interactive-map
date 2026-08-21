import { pushIfNew, removeFromOrder, moveToFront, moveToBack, moveForward, moveBackward } from './orderList.js'

describe('pushIfNew', () => {
  test('appends a new id to the back (front of visual stack)', () => {
    const order = ['a', 'b']
    pushIfNew(order, 'c')
    expect(order).toEqual(['a', 'b', 'c'])
  })

  test('leaves an already-tracked id untouched', () => {
    const order = ['a', 'b', 'c']
    pushIfNew(order, 'b')
    expect(order).toEqual(['a', 'b', 'c'])
  })
})

describe('removeFromOrder', () => {
  test('removes a tracked id', () => {
    const order = ['a', 'b', 'c']
    removeFromOrder(order, 'b')
    expect(order).toEqual(['a', 'c'])
  })

  test('no-ops for an untracked id', () => {
    const order = ['a', 'b']
    removeFromOrder(order, 'z')
    expect(order).toEqual(['a', 'b'])
  })
})

describe('moveToFront', () => {
  test('moves an existing id to the end of the array', () => {
    const order = ['a', 'b', 'c']
    moveToFront(order, 'a')
    expect(order).toEqual(['b', 'c', 'a'])
  })

  test('appends an untracked id', () => {
    const order = ['a', 'b']
    moveToFront(order, 'z')
    expect(order).toEqual(['a', 'b', 'z'])
  })
})

describe('moveToBack', () => {
  test('moves an existing id to the start of the array', () => {
    const order = ['a', 'b', 'c']
    moveToBack(order, 'c')
    expect(order).toEqual(['c', 'a', 'b'])
  })

  test('prepends an untracked id', () => {
    const order = ['a', 'b']
    moveToBack(order, 'z')
    expect(order).toEqual(['z', 'a', 'b'])
  })
})

describe('moveForward', () => {
  test('swaps with the next entry', () => {
    const order = ['a', 'b', 'c']
    moveForward(order, 'a')
    expect(order).toEqual(['b', 'a', 'c'])
  })

  test('no-ops when already at the front', () => {
    const order = ['a', 'b', 'c']
    moveForward(order, 'c')
    expect(order).toEqual(['a', 'b', 'c'])
  })

  test('no-ops for an untracked id', () => {
    const order = ['a', 'b']
    moveForward(order, 'z')
    expect(order).toEqual(['a', 'b'])
  })
})

describe('moveBackward', () => {
  test('swaps with the previous entry', () => {
    const order = ['a', 'b', 'c']
    moveBackward(order, 'c')
    expect(order).toEqual(['a', 'c', 'b'])
  })

  test('no-ops when already at the back', () => {
    const order = ['a', 'b', 'c']
    moveBackward(order, 'a')
    expect(order).toEqual(['a', 'b', 'c'])
  })

  test('no-ops for an untracked id', () => {
    const order = ['a', 'b']
    moveBackward(order, 'z')
    expect(order).toEqual(['a', 'b'])
  })
})
