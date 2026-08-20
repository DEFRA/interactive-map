import { createHarness } from './__helpers__/harness.js'

// fireGeometryChange/emitGeometryValidation/pushUndo are the shared mixin from
// utils/geometryValidation.js — their own behaviour is covered by
// utils/geometryValidation.test.js. This file only tests what's specific to editPointMode:
// pushUndo's UNDO_OP_PHASE wiring for 'move_point', handleUndo's single-op-type dispatch,
// and undoMovePoint itself.
describe('undoHandlers', () => {
  test('pushUndo maps move_point to the commit-move phase', () => {
    jest.useFakeTimers()
    const { ctx, map } = createHarness()
    map.fire.mockClear()
    ctx.pushUndo({ type: 'move_point', featureId: 'feat-1', vertexIndex: 0 })
    jest.runAllTimers()
    expect(map.fire).toHaveBeenCalledWith('draw.geometrychange', expect.objectContaining({ phase: 'commit-move' }))
    jest.useRealTimers()
  })

  test('handleUndo ignores an empty stack and dispatches the single move_point op type', () => {
    const { ctx, state, map } = createHarness()
    ctx.handleUndo(state) // empty → no throw
    const spy = jest.spyOn(ctx, 'undoMovePoint').mockImplementation(() => {})
    map._undoStack.push({ type: 'move_point', featureId: 'feat-1', vertexIndex: 0, previousPosition: [0, 0] })
    ctx.handleUndo(state)
    expect(spy).toHaveBeenCalledTimes(1)

    map._undoStack.push({ type: 'unknown' })
    expect(() => ctx.handleUndo(state)).not.toThrow()
  })

  test('handleUndo re-validates with the inverse change phase', () => {
    jest.useFakeTimers()
    const { ctx, state, map } = createHarness()
    map._undoStack.push({ type: 'move_point', featureId: 'feat-1', vertexIndex: 0, previousPosition: [1, 1] })
    map.fire.mockClear()
    ctx.handleUndo(state)
    jest.runAllTimers()
    expect(map.fire).toHaveBeenCalledWith('draw.geometrychange', expect.objectContaining({
      phase: 'commit-move',
      vertexIndex: 0,
      feature: expect.any(Object)
    }))
    jest.useRealTimers()
  })

  test('undoMovePoint restores the previous position directly, guarding a missing feature', () => {
    const { ctx, state } = createHarness()
    ctx.undoMovePoint({ ...state, featureId: 'missing' }, { previousPosition: [0, 0], featureId: 'missing' })
    ctx.undoMovePoint(state, { previousPosition: [3, 4], featureId: 'feat-1' })
    expect(ctx.getFeature('feat-1').coordinates).toEqual([3, 4])
  })
})
