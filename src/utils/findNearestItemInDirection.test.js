import { findNearestItemInDirection } from './findNearestItemInDirection.js'

describe('findNearestItemInDirection', () => {
  const items = [
    { id: 'center', x: 0, y: 0 },
    { id: 'up', x: 0, y: -10 },
    { id: 'down', x: 0, y: 10 },
    { id: 'left', x: -10, y: 0 },
    { id: 'right', x: 10, y: 0 }
  ]

  test.each([
    ['ArrowUp', 'up'],
    ['ArrowDown', 'down'],
    ['ArrowLeft', 'left'],
    ['ArrowRight', 'right']
  ])('finds the nearest item to the %s of the current one', (direction, expectedId) => {
    expect(findNearestItemInDirection(items, 'center', direction)).toBe(expectedId)
  })

  test('returns the current id unchanged when nothing qualifies in that direction', () => {
    const single = [{ id: 'only', x: 0, y: 0 }]
    expect(findNearestItemInDirection(single, 'only', 'ArrowUp')).toBe('only')
  })

  test('returns currentId unchanged when the item list is empty', () => {
    expect(findNearestItemInDirection([], 'anything', 'ArrowUp')).toBe('anything')
  })

  test('skips items with no screen coordinates', () => {
    const withUnpositioned = [
      { id: 'center', x: 0, y: 0 },
      { id: 'no-coords' },
      { id: 'up', x: 0, y: -10 }
    ]
    expect(findNearestItemInDirection(withUnpositioned, 'center', 'ArrowUp')).toBe('up')
  })

  test('returns currentId unchanged when no item has coordinates at all', () => {
    const noneWithCoords = [{ id: 'a' }, { id: 'b' }]
    expect(findNearestItemInDirection(noneWithCoords, 'a', 'ArrowUp')).toBe('a')
  })

  test('treats an unresolvable currentId as starting from the first positioned item', () => {
    expect(findNearestItemInDirection(items, 'not-in-list', 'ArrowRight')).toBe('right')
  })
})

// spatialNavigate's own contract guarantees a valid index in practice (see its own tests), so
// this can't be reached through findNearestItemInDirection's real dependency — mocked here,
// matching labels.test.js's identical fallback test for navigateToNextLabel, purely to prove
// the defensive `?? currentId` itself degrades gracefully rather than crashing if that
// guarantee were ever weakened.
describe('findNearestItemInDirection — defensive fallback', () => {
  afterEach(() => {
    jest.dontMock('./spatialNavigate.js')
    jest.resetModules()
  })

  test('falls back to currentId if spatialNavigate ever returns an out-of-range index', () => {
    jest.resetModules()
    jest.doMock('./spatialNavigate.js', () => ({ spatialNavigate: () => -1 }))
    const { findNearestItemInDirection: fn } = require('./findNearestItemInDirection.js')
    const items = [{ id: 'center', x: 0, y: 0 }, { id: 'up', x: 0, y: -10 }]
    expect(fn(items, 'center', 'ArrowUp')).toBe('center')
  })
})
