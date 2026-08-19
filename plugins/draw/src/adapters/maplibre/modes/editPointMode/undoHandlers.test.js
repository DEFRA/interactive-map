import { createHarness } from './__helpers__/harness.js'
import { createUndoStack } from '../../../../utils/undoStack.js'

describe('undoHandlers', () => {
  test('pushUndo is a no-op without a stack and pushes otherwise', () => {
    const { ctx, map } = createHarness()
    map._undoStack = null
    expect(() => ctx.pushUndo({ type: 'move_point' })).not.toThrow()
    map._undoStack = createUndoStack(() => {})
    ctx.pushUndo({ type: 'move_point' })
    expect(map._undoStack).toHaveLength(1)
  })

  test('pushUndo emits a deferred commit-level geometrychange with the change phase', () => {
    jest.useFakeTimers()
    const { ctx, map } = createHarness()
    map.fire.mockClear()

    ctx.pushUndo({ type: 'move_point', featureId: 'feat-1', vertexIndex: 0 })
    // Deferred a tick to avoid re-entrancy — nothing fired synchronously.
    expect(map.fire).not.toHaveBeenCalledWith('draw.geometrychange', expect.anything())

    jest.runAllTimers()
    expect(map.fire).toHaveBeenCalledWith('draw.geometrychange', expect.objectContaining({
      phase: 'commit-move',
      vertexIndex: 0,
      feature: expect.any(Object)
    }))
    jest.useRealTimers()
  })

  test('pushUndo does not emit a geometrychange for unmapped op types', () => {
    jest.useFakeTimers()
    const { ctx, map } = createHarness()
    map.fire.mockClear()
    ctx.pushUndo({ type: 'draw_point', featureId: 'feat-1' })
    jest.runAllTimers()
    expect(map.fire).not.toHaveBeenCalledWith('draw.geometrychange', expect.anything())
    jest.useRealTimers()
  })

  test('emitGeometryValidation does not fire once the feature is gone', () => {
    jest.useFakeTimers()
    const { ctx, map } = createHarness()
    map.fire.mockClear()
    ctx.emitGeometryValidation('commit-move', 0, 'missing-feature')
    jest.runAllTimers()
    expect(map.fire).not.toHaveBeenCalledWith('draw.geometrychange', expect.anything())
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

  test('fireGeometryChange fires draw.update only when the feature exists', () => {
    const { ctx, state, map } = createHarness()
    ctx.fireGeometryChange(state)
    expect(map.fire).toHaveBeenCalledWith('draw.update', expect.objectContaining({ action: 'change_coordinates' }))
    map.fire.mockClear()
    ctx.fireGeometryChange({ featureId: 'missing' })
    expect(map.fire).not.toHaveBeenCalled()
  })

  test('undoMovePoint restores the previous position directly, guarding a missing feature', () => {
    const { ctx, state } = createHarness()
    ctx.undoMovePoint({ ...state, featureId: 'missing' }, { previousPosition: [0, 0], featureId: 'missing' })
    ctx.undoMovePoint(state, { previousPosition: [3, 4], featureId: 'feat-1' })
    expect(ctx.getFeature('feat-1').coordinates).toEqual([3, 4])
  })
})
