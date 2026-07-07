import { createHarness } from './__helpers__/harness.js'
import { createUndoStack } from '../../../../utils/undoStack.js'
import { getRingSegments } from './geometryHelpers.js'

describe('undoHandlers', () => {
  test('pushUndo is a no-op without a stack and pushes otherwise', () => {
    const { ctx, map } = createHarness()
    map._undoStack = null
    expect(() => ctx.pushUndo({ type: 'move_vertex' })).not.toThrow()
    map._undoStack = createUndoStack(() => {})
    ctx.pushUndo({ type: 'move_vertex' })
    expect(map._undoStack.length).toBe(1)
  })

  test('pushUndo emits a deferred commit-level geometrychange with the change kind', () => {
    jest.useFakeTimers()
    const { ctx, map } = createHarness()
    map.fire.mockClear()

    ctx.pushUndo({ type: 'move_vertex', featureId: 'feat-1', vertexIndex: 2 })
    // Deferred a tick to avoid re-entrancy — nothing fired synchronously.
    expect(map.fire).not.toHaveBeenCalledWith('draw.geometrychange', expect.anything())

    jest.runAllTimers()
    expect(map.fire).toHaveBeenCalledWith('draw.geometrychange', expect.objectContaining({
      kind: 'move',
      vertexIndex: 2,
      feature: expect.any(Object)
    }))
    jest.useRealTimers()
  })

  test('pushUndo does not emit a geometrychange for unmapped op types', () => {
    jest.useFakeTimers()
    const { ctx, map } = createHarness()
    map.fire.mockClear()
    ctx.pushUndo({ type: 'draw_vertex', featureId: 'feat-1' })
    jest.runAllTimers()
    expect(map.fire).not.toHaveBeenCalledWith('draw.geometrychange', expect.anything())
    jest.useRealTimers()
  })

  test('emitGeometryValidation does not fire once the feature is gone', () => {
    jest.useFakeTimers()
    const { ctx, map } = createHarness()
    map.fire.mockClear()
    ctx.emitGeometryValidation('move', 0, 'missing-feature')
    jest.runAllTimers()
    expect(map.fire).not.toHaveBeenCalledWith('draw.geometrychange', expect.anything())
    jest.useRealTimers()
  })

  test('handleUndo ignores an empty stack and dispatches by operation type', () => {
    const { ctx, state, map } = createHarness()
    ctx.handleUndo(state) // empty → no throw
    const spies = ['undoMoveVertex', 'undoInsertVertex', 'undoDeleteVertex'].map((m) => jest.spyOn(ctx, m).mockImplementation(() => {}))
    map._undoStack.push({ type: 'move_vertex', featureId: 'feat-1', vertexIndex: 0, previousPosition: [0, 0] })
    ctx.handleUndo(state)
    map._undoStack.push({ type: 'insert_vertex', featureId: 'feat-1', vertexIndex: 1 })
    ctx.handleUndo(state)
    map._undoStack.push({ type: 'delete_vertex', featureId: 'feat-1', vertexIndex: 1, position: [0, 0] })
    ctx.handleUndo(state)
    expect(spies.every((s) => s.mock.calls.length === 1)).toBe(true)

    map._undoStack.push({ type: 'unknown' })
    expect(() => ctx.handleUndo(state)).not.toThrow()
  })

  test('handleUndo re-validates with the inverse change kind (undo of a delete re-inserts)', () => {
    jest.useFakeTimers()
    const { ctx, state, map } = createHarness()
    jest.spyOn(ctx, 'undoDeleteVertex').mockImplementation(() => {})
    map._undoStack.push({ type: 'delete_vertex', featureId: 'feat-1', vertexIndex: 1, position: [0, 0] })
    map.fire.mockClear()
    ctx.handleUndo(state)
    jest.runAllTimers()
    expect(map.fire).toHaveBeenCalledWith('draw.geometrychange', expect.objectContaining({
      kind: 'insert',
      vertexIndex: 1,
      feature: expect.any(Object)
    }))
    jest.useRealTimers()
  })

  test('fireGeometryChange fires draw.update only when the feature exists', () => {
    const { ctx, state, map } = createHarness()
    ctx.fireGeometryChange(state)
    expect(map.fire).toHaveBeenCalledWith('draw.update', expect.objectContaining({ action: 'change_coordinates' }))
    map.fire.mockClear()
    ctx.fireGeometryChange({ featureId: 'missing' })
    expect(map.fire).not.toHaveBeenCalled()
  })

  test('undoMoveVertex restores the previous position, guarding missing feature/segment', () => {
    const { ctx, state } = createHarness()
    ctx.undoMoveVertex({ ...state, featureId: 'missing' }, { vertexIndex: 0, previousPosition: [0, 0], featureId: 'missing' })
    ctx.undoMoveVertex(state, { vertexIndex: 99, previousPosition: [0, 0], featureId: 'feat-1' })
    state.selectedVertexIndex = 0
    ctx.undoMoveVertex(state, { vertexIndex: 0, previousPosition: [3, 4], featureId: 'feat-1' })
    expect(ctx.getVerticies('feat-1')[0]).toEqual([3, 4])

    // Skips the touch target update when the selected vertex is gone
    ctx.undoMoveVertex({ ...state, selectedVertexIndex: 99 }, { vertexIndex: 0, previousPosition: [1, 1], featureId: 'feat-1' })
    expect(ctx.getVerticies('feat-1')[0]).toEqual([1, 1])
  })

  test('undoInsertVertex removes the inserted vertex and clears the selection', () => {
    const { ctx, state, api } = createHarness()
    ctx.undoInsertVertex(state, { vertexIndex: 1, featureId: 'feat-1' })
    expect(ctx.getVerticies('feat-1')).toHaveLength(3)
    expect(api.changeMode).toHaveBeenCalledWith('edit_vertex', expect.objectContaining({ selectedVertexIndex: -1 }))

    // Guards a missing feature and an out-of-range index
    ctx.undoInsertVertex({ ...state, featureId: 'missing' }, { vertexIndex: 0, featureId: 'missing' })
    ctx.undoInsertVertex(state, { vertexIndex: 999, featureId: 'feat-1' })
    expect(ctx.getVerticies('feat-1')).toHaveLength(3)
  })

  test('undoDeleteVertex re-inserts, handling boundary, fallback and missing feature', () => {
    const { ctx, state } = createHarness()
    ctx.undoDeleteVertex({ ...state, featureId: 'missing' }, { vertexIndex: 0, position: [1, 1], featureId: 'missing' })
    // Fallback: index far beyond any segment boundary → no result → no-op
    ctx.undoDeleteVertex(state, { vertexIndex: 999, position: [1, 1], featureId: 'feat-1' })
    expect(ctx.getVerticies('feat-1')).toHaveLength(4)
    // Success: re-insert at index 1
    ctx.undoDeleteVertex(state, { vertexIndex: 1, position: [1, 1], featureId: 'feat-1' })
    expect(ctx.getVerticies('feat-1')).toHaveLength(5)
    // Boundary: index === segment.start + segment.length
    const seg = getRingSegments(ctx.getFeature('feat-1'))[0]
    ctx.undoDeleteVertex(state, { vertexIndex: seg.start + seg.length, position: [2, 2], featureId: 'feat-1' })
    expect(ctx.getVerticies('feat-1')).toHaveLength(6)
  })
})
