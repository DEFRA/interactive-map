import { movePoint, undoMovePoint, applyPointUndo } from './pointOps.js'
import { pointFeature } from '../__helpers__/harness.js'

describe('movePoint', () => {
  test('writes the coordinate directly, ignoring the unused index', () => {
    const feature = pointFeature([0, 0])
    movePoint(feature, 0, [5, 5])
    expect(feature.getGeometry().getCoordinates()).toEqual([5, 5])
  })
})

describe('undoMovePoint', () => {
  test('restores the previous coordinate and returns vertex index 0', () => {
    const feature = pointFeature([5, 5])
    expect(undoMovePoint(feature, { previousCoord: [1, 2] })).toBe(0)
    expect(feature.getGeometry().getCoordinates()).toEqual([1, 2])
  })
})

describe('applyPointUndo', () => {
  test('dispatches move_vertex to undoMovePoint', () => {
    const feature = pointFeature([5, 5])
    expect(applyPointUndo(feature, { type: 'move_vertex', previousCoord: [3, 4] })).toBe(0)
    expect(feature.getGeometry().getCoordinates()).toEqual([3, 4])
  })

  test('returns -1 for an unknown operation type', () => {
    const feature = pointFeature([5, 5])
    expect(applyPointUndo(feature, { type: 'unknown' })).toBe(-1)
    expect(feature.getGeometry().getCoordinates()).toEqual([5, 5])
  })
})
