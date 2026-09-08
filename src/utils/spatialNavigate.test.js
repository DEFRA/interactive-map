import { spatialNavigate } from './spatialNavigate.js'

describe('spatialNavigate', () => {
  const start = [0, 0]
  const pixels = [[0, 0], [0, -10], [0, 10], [-10, 0], [10, 0]]

  test.each([
    ['ArrowUp', 1],
    ['ArrowDown', 2],
    ['ArrowLeft', 3],
    ['ArrowRight', 4]
  ])('finds the nearest pixel for %s', (direction, expectedIndex) => {
    expect(spatialNavigate(start, pixels, direction)).toBe(expectedIndex)
  })

  test('considers all pixels for an unrecognised direction', () => {
    expect(spatialNavigate(start, pixels, 'Tab')).toBe(1)
  })

  test('considers all pixels when no direction is given (nearest overall)', () => {
    expect(spatialNavigate(start, pixels, undefined)).toBe(1)
  })

  test('falls back to the start point when no pixel is in the quadrant', () => {
    expect(spatialNavigate(start, [[0, 0]], 'ArrowUp')).toBe(0)
  })

  test('picks the closer of two candidates in the same direction', () => {
    const pixels = [[0, 0], [10, 0], [2, 0]]
    expect(spatialNavigate(start, pixels, 'ArrowRight')).toBe(2)
  })

  test('keeps the first-seen closer candidate rather than a later farther one', () => {
    const pixels = [[0, 0], [2, 0], [10, 0]]
    expect(spatialNavigate(start, pixels, 'ArrowRight')).toBe(1)
  })

  test('a diagonal candidate with dx > dy counts as ArrowRight, not ArrowUp/Down', () => {
    const pixels = [[0, 0], [3, 1], [1, 0]]
    expect(spatialNavigate(start, pixels, 'ArrowRight')).toBe(2)
  })
})
