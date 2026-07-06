import { coordToPixel, pixelToCoord, pixelDist, arrayToPixel, pixelToArray, nudgeCoord } from './olCoords.js'
import { createFakeMap } from '../__helpers__/harness.js'

const map = createFakeMap()

test('converts between OL arrays and {x, y} pixel objects', () => {
  expect(coordToPixel(map, [10, 20])).toEqual({ x: 10, y: 20 })
  expect(pixelToCoord(map, { x: 10, y: 20 })).toEqual([10, 20])
  expect(arrayToPixel([1, 2])).toEqual({ x: 1, y: 2 })
  expect(pixelToArray({ x: 1, y: 2 })).toEqual([1, 2])
  expect(pixelDist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
})

test('nudgeCoord offsets a coordinate by screen pixels', () => {
  expect(nudgeCoord(map, [10, 20], 5, -3)).toEqual([15, 17])
})

test('unprojectable coordinates return null / stay put', () => {
  const blindMap = { getPixelFromCoordinate: () => null }
  expect(coordToPixel(blindMap, [1, 1])).toBeNull()
  expect(nudgeCoord(blindMap, [1, 1], 5, 5)).toEqual([1, 1])
})
