import { sharedUndoHandlers } from './geometryValidation.js'
import { createUndoStack } from '../../../utils/undoStack.js'

const makeCtx = (overrides = {}) => ({
  ...sharedUndoHandlers,
  UNDO_OP_PHASE: { move: 'commit-move' },
  map: { fire: jest.fn(), _undoStack: createUndoStack(() => {}) },
  getFeature: jest.fn((id) => (id === 'missing' ? undefined : { toGeoJSON: () => ({ type: 'Feature', id }) })),
  ...overrides
})

describe('fireGeometryChange', () => {
  test('fires draw.update only when the feature exists', () => {
    const ctx = makeCtx()
    ctx.fireGeometryChange({ featureId: 'feat-1' })
    expect(ctx.map.fire).toHaveBeenCalledWith('draw.update', expect.objectContaining({ action: 'change_coordinates' }))

    ctx.map.fire.mockClear()
    ctx.fireGeometryChange({ featureId: 'missing' })
    expect(ctx.map.fire).not.toHaveBeenCalled()
  })
})

describe('emitGeometryValidation', () => {
  test('does nothing without a phase', () => {
    jest.useFakeTimers()
    const ctx = makeCtx()
    ctx.emitGeometryValidation(undefined, 0, 'feat-1')
    jest.runAllTimers()
    expect(ctx.map.fire).not.toHaveBeenCalled()
    jest.useRealTimers()
  })

  test('fires a deferred draw.geometrychange with the phase, vertexIndex and feature', () => {
    jest.useFakeTimers()
    const ctx = makeCtx()
    ctx.emitGeometryValidation('commit-move', 2, 'feat-1')
    // Deferred a tick to avoid re-entrancy — nothing fired synchronously.
    expect(ctx.map.fire).not.toHaveBeenCalled()

    jest.runAllTimers()
    expect(ctx.map.fire).toHaveBeenCalledWith('draw.geometrychange', expect.objectContaining({
      phase: 'commit-move',
      vertexIndex: 2,
      feature: expect.any(Object)
    }))
    jest.useRealTimers()
  })

  test('does not fire once the feature is gone', () => {
    jest.useFakeTimers()
    const ctx = makeCtx()
    ctx.emitGeometryValidation('commit-move', 0, 'missing')
    jest.runAllTimers()
    expect(ctx.map.fire).not.toHaveBeenCalled()
    jest.useRealTimers()
  })
})

describe('pushUndo', () => {
  test('is a no-op without a stack', () => {
    const ctx = makeCtx({ map: { fire: jest.fn(), _undoStack: null } })
    expect(() => ctx.pushUndo({ type: 'move' })).not.toThrow()
  })

  test('pushes the operation and emits validation for a mapped op type', () => {
    jest.useFakeTimers()
    const ctx = makeCtx()
    ctx.pushUndo({ type: 'move', featureId: 'feat-1', vertexIndex: 0 })
    expect(ctx.map._undoStack.length).toBe(1)

    jest.runAllTimers()
    expect(ctx.map.fire).toHaveBeenCalledWith('draw.geometrychange', expect.objectContaining({ phase: 'commit-move' }))
    jest.useRealTimers()
  })

  test('does not emit validation for an unmapped op type', () => {
    jest.useFakeTimers()
    const ctx = makeCtx()
    ctx.pushUndo({ type: 'unmapped', featureId: 'feat-1' })
    jest.runAllTimers()
    expect(ctx.map.fire).not.toHaveBeenCalled()
    jest.useRealTimers()
  })
})
