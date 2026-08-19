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

  test('onFeature does not re-snapshot mid-drag', () => {
    const { ctx, state } = createHarness()
    state.dragMoving = true
    state._moveStartPosition = [1, 1]
    ctx.onFeature(state, { featureTarget: activeFeatureTarget, lngLat: { lng: 9, lat: 9 } })
    expect(state._moveStartPosition).toEqual([1, 1])
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
    Object.assign(state, { dragMoveLocation: { lng: 2, lat: 2 } })
    ctx.onDrag(state, dragEvt(3, 3))
    expect(state.dragMoving).toBe(true)
  })

  test('onDrag with snap active writes the snapped coordinate directly', () => {
    const { ctx, state } = createHarness()
    state.getSnapEnabled = () => true
    state.canDragMove = true
    const map = ctx.map
    map._snapInstance = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn(() => { map._snapInstance.snapStatus = true; map._snapInstance.snapCoords = [7, 8] }) }
    ctx.onDrag(state, dragEvt(2, 2))
    expect(state.feature.coordinates).toEqual([7, 8])
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
