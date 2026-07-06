import Feature from 'ol/Feature.js'
import Polygon from 'ol/geom/Polygon.js'
import { deleteVertex, insertAtMidpoint, moveVertex } from './vertexOps.js'
import { polygonFeature, lineFeature } from '../__helpers__/harness.js'

const SQUARE = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
const HOLE = [[2, 2], [4, 2], [4, 4], [2, 2]]
const ring = (feature, i = 0) => feature.getGeometry().getCoordinates()[i]

describe('deleteVertex', () => {
  test('removes the vertex and keeps the ring closed', () => {
    const feature = polygonFeature(SQUARE)
    expect(deleteVertex(feature, 1)).toEqual({ deletedIndex: 1, deletedCoord: [10, 0] })
    expect(ring(feature)).toEqual([[0, 0], [10, 10], [0, 10], [0, 0]])
  })

  test('deleting ring vertex 0 syncs the closing coordinate', () => {
    const feature = polygonFeature(SQUARE)
    deleteVertex(feature, 0)
    expect(ring(feature)).toEqual([[10, 0], [10, 10], [0, 10], [10, 0]])
  })

  test('refuses to shrink below the minimum (3 for rings, 2 for lines) or for bad indices', () => {
    expect(deleteVertex(polygonFeature([[0, 0], [10, 0], [10, 10], [0, 0]]), 1)).toBeNull()
    expect(deleteVertex(lineFeature([[0, 0], [10, 0]]), 0)).toBeNull()
    expect(deleteVertex(polygonFeature(SQUARE), 99)).toBeNull()
  })
})

describe('insertAtMidpoint', () => {
  test('inserts after the midpoint position in the first ring', () => {
    const feature = polygonFeature(SQUARE) // 4 vertices; midpoint 0 sits between v0 and v1
    expect(insertAtMidpoint(feature, [[5, 0]], 4, 4)).toEqual({ insertedIndex: 1 })
    expect(ring(feature)[1]).toEqual([5, 0])
  })

  test('maps midpoints in later rings to their global insert position', () => {
    const feature = new Feature(new Polygon([SQUARE, HOLE]))
    // 7 vertices; outer ring owns midpoints 0-3, hole owns 4-6. Hole midpoint 1 = between hole v1 and v2.
    const midpoints = [[5, 0], [10, 5], [5, 10], [0, 5], [3, 2], [4, 3], [3, 3]]
    expect(insertAtMidpoint(feature, midpoints, 7 + 5, 7)).toEqual({ insertedIndex: 6 })
    expect(ring(feature, 1)[2]).toEqual([4, 3])
  })

  test('unknown midpoints are a no-op', () => {
    expect(insertAtMidpoint(polygonFeature(SQUARE), [[5, 0]], 99, 4)).toBeNull()
    // A midpoint index past every segment's midpoints (stale midpoint array) is also refused
    const extra = [[5, 0], [10, 5], [5, 10], [0, 5], [9, 9]]
    expect(insertAtMidpoint(polygonFeature(SQUARE), extra, 4 + 4, 4)).toBeNull()
  })
})

describe('moveVertex', () => {
  test('moves the vertex, syncing the closing coordinate for ring vertex 0', () => {
    const feature = polygonFeature(SQUARE)
    moveVertex(feature, 0, [1, 1])
    expect(ring(feature)[0]).toEqual([1, 1])
    expect(ring(feature).at(-1)).toEqual([1, 1])
    moveVertex(feature, 2, [20, 20])
    expect(ring(feature)[2]).toEqual([20, 20])
  })

  test('an invalid index leaves the geometry untouched', () => {
    const feature = polygonFeature(SQUARE)
    moveVertex(feature, 99, [1, 1])
    expect(ring(feature)).toEqual(SQUARE)
  })
})
