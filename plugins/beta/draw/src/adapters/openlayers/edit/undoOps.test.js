import { applyUndo, undoMoveVertex, undoInsertVertex, undoDeleteVertex } from './undoOps.js'
import { polygonFeature, lineFeature } from '../__helpers__/harness.js'

const SQUARE = [[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]
const ring = (feature) => feature.getGeometry().getCoordinates()[0]

describe('undoMoveVertex', () => {
  test('restores the previous coordinate, syncing the closing coord for ring vertex 0', () => {
    const feature = polygonFeature(SQUARE)
    expect(undoMoveVertex(feature, { vertexIndex: 0, previousCoord: [5, 5] })).toBe(0)
    expect(ring(feature)[0]).toEqual([5, 5])
    expect(ring(feature).at(-1)).toEqual([5, 5])
  })

  test('returns -1 for an index outside the geometry', () => {
    expect(undoMoveVertex(polygonFeature(SQUARE), { vertexIndex: 99, previousCoord: [0, 0] })).toBe(-1)
  })
})

describe('undoInsertVertex', () => {
  test('removes the inserted vertex and keeps the ring closed', () => {
    const feature = polygonFeature([[0, 0], [50, 0], [100, 0], [100, 100], [0, 100], [0, 0]])
    expect(undoInsertVertex(feature, { vertexIndex: 1 })).toBe(-1)
    expect(ring(feature)).toEqual(SQUARE)
  })

  test('returns -1 for an index outside the geometry', () => {
    expect(undoInsertVertex(polygonFeature(SQUARE), { vertexIndex: 99 })).toBe(-1)
  })
})

describe('undoDeleteVertex', () => {
  test('re-inserts the deleted coordinate and re-selects it', () => {
    const feature = polygonFeature([[0, 0], [100, 0], [0, 100], [0, 0]]) // square minus [100,100]
    expect(undoDeleteVertex(feature, { vertexIndex: 2, deletedCoord: [100, 100] })).toBe(2)
    expect(ring(feature)).toEqual([[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]])
  })

  test('re-inserts at a segment boundary (the deleted vertex was the last of its part)', () => {
    const feature = lineFeature([[0, 0], [10, 0]]) // [20,0] was deleted from the end
    expect(undoDeleteVertex(feature, { vertexIndex: 2, deletedCoord: [20, 0] })).toBe(2)
    expect(feature.getGeometry().getCoordinates()).toEqual([[0, 0], [10, 0], [20, 0]])
  })

  test('returns -1 when the index fits no segment at all', () => {
    expect(undoDeleteVertex(lineFeature([[0, 0], [10, 0]]), { vertexIndex: 99, deletedCoord: [0, 0] })).toBe(-1)
  })
})

describe('applyUndo dispatch', () => {
  test('routes each operation type and ignores unknown ones', () => {
    const feature = polygonFeature(SQUARE)
    expect(applyUndo(feature, { type: 'move_vertex', vertexIndex: 1, previousCoord: [90, 0] })).toBe(1)
    expect(applyUndo(feature, { type: 'delete_vertex', vertexIndex: 1, deletedCoord: [95, 0] })).toBe(1)
    expect(applyUndo(feature, { type: 'insert_vertex', vertexIndex: 1 })).toBe(-1)
    expect(applyUndo(feature, { type: 'resize' })).toBe(-1)
  })
})
