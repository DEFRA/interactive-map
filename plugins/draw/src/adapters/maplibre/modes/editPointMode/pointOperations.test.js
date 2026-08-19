import { createHarness } from './__helpers__/harness.js'

describe('pointOperations', () => {
  test('getOffset applies step/nudge amounts and returns the coord unchanged without an event', () => {
    const { ctx } = createHarness()
    const stepped = ctx.getOffset([5, 5], { key: 'ArrowRight', shiftKey: false })
    const nudged = ctx.getOffset([5, 5], { key: 'ArrowRight', shiftKey: true })
    expect(stepped.lng).not.toBe(5)
    expect(Math.abs(nudged.lng - 5)).toBeLessThan(Math.abs(stepped.lng - 5))
    expect(ctx.getOffset([5, 5], null)).toEqual({ lng: 5, lat: 5 })
  })

  test('getOffsetByDelta applies step/nudge amounts along an explicit direction, mirroring getOffset\'s shiftKey polarity', () => {
    const { ctx } = createHarness()
    const large = ctx.getOffsetByDelta([5, 5], 1, 0, true)
    const small = ctx.getOffsetByDelta([5, 5], 1, 0, false)
    expect(large.lng).not.toBe(5)
    expect(Math.abs(small.lng - 5)).toBeLessThan(Math.abs(large.lng - 5))
    expect(ctx.getOffsetByDelta([5, 5], 0, 0, true)).toEqual({ lng: 5, lat: 5 })
  })

  test('resolveSnapTarget is a no-op passthrough to the candidate coordinate when snap is disabled', () => {
    const { ctx, state } = createHarness()
    const candidate = { lng: 3, lat: 4 }
    expect(ctx.resolveSnapTarget(state, 1, 0, [0, 0], () => candidate)).toEqual(candidate)
  })

  test('resolveSnapTarget snaps to a nearby target and breaks out of an active snap', () => {
    const { ctx, state, map } = createHarness()
    state.getSnapEnabled = () => true

    map._snapInstance = { status: true, snapStatus: true, snapCoords: [7, 8], snapToClosestPoint: jest.fn() }
    const snapped = ctx.resolveSnapTarget(state, 0, -1, [5, 5], () => ({ lng: 5, lat: 4 }))
    expect(state._isSnapped).toBe(true)
    expect(snapped).toEqual({ lng: 7, lat: 8 })

    // Already snapped → next call breaks out of the snap radius instead of re-snapping
    const escaped = ctx.resolveSnapTarget(state, -1, 0, [7, 8], () => ({ lng: 6, lat: 8 }))
    expect(state._isSnapped).toBe(false)
    expect(escaped.lng).toBeLessThan(7)
  })

  test('getPointCoord reads the feature\'s own coordinate, no path/index lookup needed', () => {
    const { ctx, state } = createHarness()
    expect(ctx.getPointCoord(state)).toEqual([5, 5])
    expect(ctx.getPointCoord({ ...state, featureId: 'missing' })).toBeUndefined()
  })

  test('getNewCoord offsets the point\'s current coordinate', () => {
    const { ctx, state } = createHarness()
    expect(ctx.getNewCoord(state, { key: 'ArrowRight', shiftKey: false })).toHaveProperty('lng')
  })

  test('movePoint mutates the coordinate directly via updateCoordinate and fires geometrychange', () => {
    const { ctx, state, map } = createHarness()
    ctx.movePoint(state, { lng: 1, lat: 2 })
    expect(state.feature.coordinates).toEqual([1, 2])
    expect(map.fire).toHaveBeenCalledWith('draw.geometrychange', state.feature)
  })

  // Regression: updateCoordinate's own changed() call only marks the feature dirty and fires
  // an internal event — it never repaints (store.js's featureChanged/render). Mouse drag/click
  // get a repaint for free via mapbox-gl-draw's own dispatch (lib/mode_handler.js auto-renders
  // after every onDrag/onClick/onMouseUp it calls), but keyboard, touch and the D-pad all move
  // a point through our own addEventListener-bound handlers, entirely outside that dispatch —
  // without this, the coordinate updated with nothing on screen ever reflecting it.
  test('movePoint explicitly triggers a render — keyboard/touch/D-pad have no other path to one', () => {
    const { ctx, state } = createHarness()
    ctx.movePoint(state, { lng: 1, lat: 2 })
    expect(ctx._ctx.store.render).toHaveBeenCalled()
  })

  test('nudgePointByDelta moves the point and pushes a single undo entry', () => {
    const { ctx, state, map } = createHarness()
    const before = [...state.feature.coordinates]
    ctx.nudgePointByDelta(state, 1, 0, true)
    expect(state.feature.coordinates).not.toEqual(before)
    expect(map._undoStack.pop()).toMatchObject({ type: 'move_point', vertexIndex: 0, previousPosition: before })
  })

  test('nudgePointByDelta no-ops when the feature is missing', () => {
    const { ctx, state, map } = createHarness()
    ctx.nudgePointByDelta({ ...state, featureId: 'missing' }, 1, 0, true)
    expect(map._undoStack).toHaveLength(0)
  })

  test('nudgePointByDelta snaps to a nearby target, breaks out of an active snap, and falls back to the raw coord when snap is inactive', () => {
    const { ctx, state, map } = createHarness()
    state.getSnapEnabled = () => true

    map._snapInstance = { status: true, snapStatus: true, snapCoords: [7, 8], snapToClosestPoint: jest.fn() }
    ctx.nudgePointByDelta(state, 0, -1, true)
    expect(state._isSnapped).toBe(true)
    expect(state.feature.coordinates).toEqual([7, 8])

    ctx.nudgePointByDelta(state, -1, 0, true) // already snapped → breaks out of the snap radius
    expect(state._isSnapped).toBe(false)

    map._snapInstance = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() }
    ctx.nudgePointByDelta(state, 1, 0, true) // snap enabled but inactive → raw offset coord
    expect(state._isSnapped).toBe(false)
  })
})
