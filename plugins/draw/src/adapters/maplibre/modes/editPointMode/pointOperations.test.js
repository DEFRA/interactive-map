import { createHarness } from './__helpers__/harness.js'

// getOffset/getOffsetByDelta/resolveSnapTarget are the shared mixin from
// utils/snapMovement.js — their own behaviour is covered by utils/snapMovement.test.js.
// This file only tests what's specific to a single-coordinate Point.
describe('pointOperations', () => {
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

  // resolveSnapTarget's own snap/break-out-of-snap branches are covered by
  // utils/snapMovement.test.js — this just checks nudgePointByDelta wires a snap hit through
  // to the moved coordinate.
  test('nudgePointByDelta honours an active snap', () => {
    const { ctx, state, map } = createHarness()
    state.getSnapEnabled = () => true
    map._snapInstance = { status: true, snapStatus: true, snapCoords: [7, 8], snapToClosestPoint: jest.fn() }
    ctx.nudgePointByDelta(state, 0, -1, true)
    expect(state._isSnapped).toBe(true)
    expect(state.feature.coordinates).toEqual([7, 8])
  })
})
