import { findNearest, findNearestVertex, findNearestMidpoint } from './vertexHitTest.js'
import { createFakeMap } from '../__helpers__/harness.js'

const map = createFakeMap()
const vertices = [[0, 0], [100, 0]]
const midpoints = [[50, 0]]

test('finds the nearest vertex within the pixel tolerance', () => {
  expect(findNearestVertex(map, vertices, { x: 98, y: 5 })).toEqual({ index: 1, type: 'vertex' })
  expect(findNearestVertex(map, vertices, { x: 50, y: 50 })).toBeNull()
})

test('midpoint hits are offset by the vertex count', () => {
  expect(findNearestMidpoint(map, midpoints, { x: 51, y: 2 }, 2)).toEqual({ index: 2, type: 'midpoint' })
  expect(findNearestMidpoint(map, midpoints, { x: 200, y: 0 }, 2)).toBeNull()
})

test('vertices take priority over midpoints; nothing in range gives null', () => {
  expect(findNearest(map, [[50, 4]], midpoints, { x: 50, y: 2 })).toEqual({ index: 0, type: 'vertex' })
  expect(findNearest(map, vertices, midpoints, { x: 51, y: 2 })).toEqual({ index: 2, type: 'midpoint' })
  expect(findNearest(map, vertices, midpoints, { x: 500, y: 500 })).toBeNull()
})

test('coordinates that cannot be projected are skipped', () => {
  const blindMap = { getPixelFromCoordinate: () => null }
  expect(findNearestVertex(blindMap, vertices, { x: 0, y: 0 })).toBeNull()
  expect(findNearestMidpoint(blindMap, midpoints, { x: 50, y: 0 }, 2)).toBeNull()
})
