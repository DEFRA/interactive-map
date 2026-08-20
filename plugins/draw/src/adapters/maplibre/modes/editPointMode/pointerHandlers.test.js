import { createHarness, dragEvt } from './__helpers__/harness.js'

const activeFeatureTarget = { properties: { active: 'true', meta: 'feature' } }

describe('pointerHandlers', () => {
  test('onFeature snapshots the move start and starts dragging via stock DirectSelect (selectedCoordPaths: [])', () => {
    const { ctx, state } = createHarness()
    ctx.onFeature(state, { featureTarget: activeFeatureTarget, lngLat: { lng: 5, lat: 5 } })
    expect(state._moveStartPosition).toEqual([5, 5])
    expect(state.canDragMove).toBe(true)
    expect(state.dragMoveLocation).toEqual({ lng: 5, lat: 5 })
  })

  // Feature anchor is [5, 5] (createHarness's default) — clicking at [2, 2] is 3 units away,
  // e.g. near the top of a pin icon rather than its tip.
  test('onFeature captures the click\'s fixed offset from the anchor', () => {
    const { ctx, state } = createHarness()
    ctx.onFeature(state, { featureTarget: activeFeatureTarget, lngLat: { lng: 2, lat: 2 } })
    expect(state._grabOffset).toEqual([3, 3])
  })

  test('onFeature does not re-snapshot mid-drag', () => {
    const { ctx, state } = createHarness()
    state.dragMoving = true
    state._moveStartPosition = [1, 1]
    state._grabOffset = [0, 0]
    ctx.onFeature(state, { featureTarget: activeFeatureTarget, lngLat: { lng: 9, lat: 9 } })
    expect(state._moveStartPosition).toEqual([1, 1])
    expect(state._grabOffset).toEqual([0, 0])
  })

  // Silencing the snap library's own raw-cursor auto-query for the whole drag is what keeps
  // the indicator and the dragged feature from falling out of sync — see
  // snapHelpers.js's setAutoSnapSuspended for the full mechanism.
  test('onFeature suspends the snap library\'s own auto-query at drag start; onMouseUp resumes it', () => {
    const { ctx, state, map } = createHarness()
    map._snapInstance = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() }

    ctx.onFeature(state, { featureTarget: activeFeatureTarget, lngLat: { lng: 5, lat: 5 } })
    expect(map._snapInstance._autoSnapSuspended).toBe(true)

    ctx.onMouseUp(state, {})
    expect(map._snapInstance._autoSnapSuspended).toBe(false)
  })

  test('onFeature suspending auto-snap is a harmless no-op when there is no snap instance', () => {
    const { ctx, state } = createHarness()
    expect(() => ctx.onFeature(state, { featureTarget: activeFeatureTarget, lngLat: { lng: 5, lat: 5 } })).not.toThrow()
  })

  test('onClick on the active feature is a no-op — the point stays selected for the whole session', () => {
    const { ctx, state, map } = createHarness()
    const before = [...state.feature.coordinates]
    ctx.onClick(state, { featureTarget: activeFeatureTarget })
    expect(state.feature.coordinates).toEqual(before)
    expect(map._undoStack).toHaveLength(0)
  })

  test('onClick elsewhere relocates the point (WCAG 2.5.7 single-pointer alternative to drag), pushing an undo entry', () => {
    const { ctx, state, map } = createHarness()
    ctx.onClick(state, { featureTarget: undefined, lngLat: { lng: 9, lat: 9 }, point: { x: 90, y: 90 } })
    expect(state.feature.coordinates).toEqual([9, 9])
    expect(map._undoStack.pop()).toMatchObject({ type: 'move_point', vertexIndex: 0, previousPosition: [5, 5] })
  })

  test('onClick honours snap when enabled and active, falling back to the raw target when inactive', () => {
    const { ctx, state, map } = createHarness()
    state.getSnapEnabled = () => true
    map._snapInstance = { status: true, snapStatus: true, snapCoords: [7, 8], snapToClosestPoint: jest.fn() }
    ctx.onClick(state, { featureTarget: undefined, lngLat: { lng: 9, lat: 9 }, point: { x: 90, y: 90 } })
    expect(state.feature.coordinates).toEqual([7, 8])

    map._snapInstance = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() }
    ctx.onClick(state, { featureTarget: undefined, lngLat: { lng: 3, lat: 3 }, point: { x: 30, y: 30 } })
    expect(state.feature.coordinates).toEqual([3, 3])
  })

  test('onClick is vetoed by a rejecting geometry validator, firing draw.placementblocked with a fallback null reason, and leaving the point untouched', () => {
    const { ctx, state, map } = createHarness()
    map._drawGeometryValidator = () => false // no {reason} shape
    ctx.onClick(state, { featureTarget: undefined, lngLat: { lng: 9, lat: 9 }, point: { x: 90, y: 90 } })
    expect(state.feature.coordinates).toEqual([5, 5])
    expect(map.fire).toHaveBeenCalledWith('draw.placementblocked', expect.objectContaining({ reason: null }))
    expect(map._undoStack).toHaveLength(0)
  })

  test('onMouseUp clears snap state, records a move undo only if the point actually moved, and delegates to stock DirectSelect', () => {
    const { ctx, state, map } = createHarness()
    ctx.onMouseUp(state, {}) // no prior snapshot → nothing recorded
    expect(map._undoStack).toHaveLength(0)

    state._moveStartPosition = [5, 5]
    ctx.movePoint(state, { lng: 9, lat: 9 })
    ctx.onMouseUp(state, {})
    expect(map._undoStack.pop()).toMatchObject({ type: 'move_point', vertexIndex: 0, previousPosition: [5, 5] })
    expect(state._moveStartPosition).toBeNull()

    // Snapshot present but the point never actually moved → no undo entry
    state._moveStartPosition = [9, 9]
    ctx.onMouseUp(state, {})
    expect(map._undoStack).toHaveLength(0)
  })

  test('onDrag skips touch, delegates without snap, and snaps when enabled', () => {
    const { ctx, state, map } = createHarness()
    ctx.onDrag({ ...state, interfaceType: 'touch' }, dragEvt(1, 1))
    expect(state.feature.coordinates).toEqual([5, 5]) // untouched — bailed early for touch

    // no snap → stock DirectSelect.onDrag/dragFeature moves the point via moveFeatures
    Object.assign(state, { canDragMove: true, dragMoveLocation: { lng: 0, lat: 0 } })
    ctx.onDrag(state, dragEvt(2, 2))
    expect(map.fire).toHaveBeenCalledWith('draw.geometrychange', expect.anything())
    expect(state.feature.coordinates).toEqual([7, 7])

    // snap enabled but inactive → resolves via dragging still (canDragMove true)
    state.getSnapEnabled = () => true
    map._snapInstance = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() }
    Object.assign(state, { dragMoveLocation: { lng: 2, lat: 2 }, _grabOffset: [0, 0] })
    ctx.onDrag(state, dragEvt(3, 3))
    expect(state.dragMoving).toBe(true)
  })

  test('onDrag with snap active writes the snapped coordinate directly', () => {
    const { ctx, state, map } = createHarness() // feature anchor at [5, 5]
    state.getSnapEnabled = () => true
    ctx.onFeature(state, { featureTarget: activeFeatureTarget, lngLat: { lng: 0, lat: 0 } }) // grab offset [5,5]
    map._snapInstance = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn(() => { map._snapInstance.snapStatus = true; map._snapInstance.snapCoords = [7, 8] }) }
    ctx.onDrag(state, dragEvt(2, 2)) // candidate = [2,2] + grab offset [5,5] = [7,7], queried and snapped
    expect(state.feature.coordinates).toEqual([7, 8])
  })

  // Regression: the candidate used to be built by accumulating the pointer's frame-to-frame
  // delta onto the feature's own (possibly already-snapped) coordinate — so once a snap moved
  // the feature onto a target, the next frame's small pointer movement produced a candidate
  // still within that same target's radius and got pulled straight back onto it, reading as
  // permanently stuck regardless of how far the mouse then moved. The candidate must instead
  // always be the pointer's current absolute position plus the fixed grab offset from drag
  // start, independent of wherever a previous frame's snap left the feature.
  test('onDrag recovers on the next frame instead of staying stuck at a target it just snapped to', () => {
    const { ctx, state, map } = createHarness() // feature anchor at [5, 5]
    ctx.onFeature(state, { featureTarget: activeFeatureTarget, lngLat: { lng: 0, lat: 0 } }) // grab offset [5,5]
    state.getSnapEnabled = () => true
    map._snapInstance = {
      status: true,
      snapStatus: false,
      snapCoords: null,
      snapToClosestPoint: jest.fn(() => { map._snapInstance.snapStatus = true; map._snapInstance.snapCoords = [7, 8] })
    }

    // Frame 1: pointer at [2,2] → candidate [7,7], found and snapped onto the target [7,8].
    ctx.onDrag(state, dragEvt(2, 2))
    expect(state.feature.coordinates).toEqual([7, 8])

    // Frame 2: pointer moves on by just one unit, to [3,2]. The fresh candidate must be built
    // from the pointer's own absolute position ([3,2] + [5,5] = [8,7]), not from last frame's
    // already-snapped [7,8] plus this frame's tiny delta (which would still read as sitting on
    // the target).
    map._snapInstance.snapToClosestPoint = jest.fn(() => { map._snapInstance.snapStatus = false; map._snapInstance.snapCoords = null })
    ctx.onDrag(state, dragEvt(3, 2))
    expect(map.project).toHaveBeenCalledWith([8, 7])
    expect(state.feature.coordinates).toEqual([8, 7])
  })

  // The click that starts a drag can land anywhere on the icon, not just on top of its anchor
  // coordinate — the anchor must move by the same delta as the pointer and snap must be queried
  // at that offset-corrected candidate, not at the raw pointer (which would snap to whatever's
  // near the cursor and jump the anchor under it the moment a candidate is found). Mirrors the
  // OL adapter's point/pointDragInteraction.js regression test for the identical bug.
  test('onDrag preserves the click\'s offset from the anchor and queries snap at the anchor\'s own candidate, not the raw pointer', () => {
    const { ctx, state, map } = createHarness() // feature anchor at [5, 5]
    // Mousedown at [2, 2] — 3 units away from the anchor, e.g. near the top of a pin icon.
    ctx.onFeature(state, { featureTarget: activeFeatureTarget, lngLat: { lng: 2, lat: 2 } })
    state.getSnapEnabled = () => true
    map._snapInstance = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() }

    // Pointer moves from [2,2] to [4,2] — a (+2, 0) delta — no snap candidate found.
    ctx.onDrag(state, dragEvt(4, 2))
    expect(state.feature.coordinates).toEqual([7, 5]) // anchor [5,5] + the pointer's own delta
    expect(map.project).toHaveBeenCalledWith([7, 5]) // queried at the anchor's candidate…
    expect(map.project).not.toHaveBeenCalledWith([4, 2]) // …never at the raw pointer position
  })

  test('onDrag with snap enabled but not canDragMove bails out', () => {
    const { ctx, state } = createHarness()
    state.getSnapEnabled = () => true
    state.canDragMove = false
    ctx.map._snapInstance = { status: true, snapStatus: true, snapCoords: [1, 1], snapToClosestPoint: jest.fn() }
    ctx.onDrag(state, dragEvt(2, 2))
    expect(state.feature.coordinates).toEqual([5, 5])
  })

  test('onTrash is a no-op — whole-feature deletion is deleteFeature\'s job, not this mode\'s', () => {
    const { ctx, state } = createHarness()
    expect(() => ctx.onTrash(state)).not.toThrow()
    expect(state.feature.coordinates).toEqual([5, 5])
  })
})
