import { createHarness, LINE } from './__helpers__/harness.js'

describe('vertexOperations', () => {
  test('updateMidpoint pushes point data to the hot source', () => {
    jest.useFakeTimers()
    const { ctx, map } = createHarness()
    ctx.updateMidpoint([1, 2])
    jest.runAllTimers()
    expect(map.getSource).toHaveBeenCalledWith('mapbox-gl-draw-hot')
  })

  test('updateVertex changes mode for a valid target and no-ops otherwise', () => {
    const { ctx, state, api } = createHarness()
    state.selectedVertexIndex = 0
    ctx.updateVertex(state, 'ArrowRight')
    expect(api.changeMode).toHaveBeenCalledWith('edit_vertex', expect.objectContaining({
      selectedVertexIndex: expect.any(Number)
    }))

    api.changeMode.mockClear()
    ctx.updateVertex({ featureId: 'missing', vertecies: [], selectedVertexIndex: -1 }, 'ArrowRight')
    expect(api.changeMode).not.toHaveBeenCalled()

    // A vertex target carries a coordPath; a midpoint target does not
    jest.spyOn(ctx, 'getVertexOrMidpoint').mockReturnValueOnce([1, 'vertex'])
    ctx.updateVertex(state, 'ArrowRight')
    expect(api.changeMode.mock.calls.at(-1)[1].coordPath).toBeDefined()
    jest.spyOn(ctx, 'getVertexOrMidpoint').mockReturnValueOnce([5, 'midpoint'])
    ctx.updateVertex(state, 'ArrowRight')
    expect(api.changeMode.mock.calls.at(-1)[1].coordPath).toBeUndefined()
  })

  test('getOffset applies step/nudge amounts and returns the coord unchanged without an event', () => {
    const { ctx } = createHarness()
    const stepped = ctx.getOffset([5, 5], { key: 'ArrowRight', shiftKey: false })
    const nudged = ctx.getOffset([5, 5], { key: 'ArrowRight', shiftKey: true })
    expect(stepped.lng).not.toBe(5)
    expect(Math.abs(nudged.lng - 5)).toBeLessThan(Math.abs(stepped.lng - 5))
    expect(ctx.getOffset([5, 5], null)).toEqual({ lng: 5, lat: 5 })
  })

  test('getNewCoord offsets the currently selected vertex', () => {
    const { ctx, state } = createHarness()
    state.selectedVertexIndex = 1
    expect(ctx.getNewCoord(state, { key: 'ArrowRight', shiftKey: false })).toHaveProperty('lng')
  })

  test('getOffsetByDelta applies step/nudge amounts along an explicit direction, mirroring getOffset\'s shiftKey polarity', () => {
    const { ctx } = createHarness()
    const large = ctx.getOffsetByDelta([5, 5], 1, 0, true)
    const small = ctx.getOffsetByDelta([5, 5], 1, 0, false)
    expect(large.lng).not.toBe(5)
    expect(Math.abs(small.lng - 5)).toBeLessThan(Math.abs(large.lng - 5))
    expect(ctx.getOffsetByDelta([5, 5], 0, 0, true)).toEqual({ lng: 5, lat: 5 })
  })

  test('nudgeVertexByDelta moves the selected vertex and pushes a single undo entry, or no-ops for a midpoint/no selection', () => {
    const { ctx, state, map } = createHarness()
    state.selectedVertexIndex = 0
    state.selectedVertexType = 'vertex'
    const before = [...state.vertecies[0]]
    ctx.nudgeVertexByDelta(state, 1, 0, true)
    expect(state.vertecies[0]).not.toEqual(before)
    expect(map._undoStack.pop()).toMatchObject({ type: 'move_vertex', vertexIndex: 0, previousPosition: before })

    map._undoStack.clear()
    ctx.nudgeVertexByDelta({ ...state, selectedVertexType: 'midpoint' }, 1, 0, true)
    ctx.nudgeVertexByDelta({ ...state, selectedVertexIndex: -1 }, 1, 0, true)
    // Passes the type/index guard but resolves to no coordinate — missing feature,
    // and a valid feature with an out-of-range index.
    ctx.nudgeVertexByDelta({ ...state, featureId: 'missing' }, 1, 0, true)
    ctx.nudgeVertexByDelta({ ...state, selectedVertexIndex: 99 }, 1, 0, true)
    expect(map._undoStack).toHaveLength(0)
  })

  test('nudgeVertexByDelta snaps to a nearby target, breaks out of an active snap, and falls back to the raw coord when snap is inactive — same as keyboard nudging (regression: MoveControl bypassed snap entirely before resolveSnapTarget was shared)', () => {
    const { ctx, state, map } = createHarness()
    state.selectedVertexIndex = 1
    state.selectedVertexType = 'vertex'
    state.getSnapEnabled = () => true

    map._snapInstance = { status: true, snapStatus: true, snapCoords: [7, 8], snapToClosestPoint: jest.fn() }
    ctx.nudgeVertexByDelta(state, 0, -1, true)
    expect(state._isSnapped).toBe(true)
    expect(state.vertecies[1]).toEqual([7, 8])

    ctx.nudgeVertexByDelta(state, -1, 0, true) // already snapped → breaks out of the snap radius
    expect(state._isSnapped).toBe(false)

    map._snapInstance = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() }
    ctx.nudgeVertexByDelta(state, 1, 0, true) // snap enabled but inactive → raw offset coord
    expect(state._isSnapped).toBe(false)
  })

  test('resolveSnapTarget is a no-op passthrough to the candidate coordinate when snap is disabled', () => {
    const { ctx, state } = createHarness()
    const candidate = { lng: 3, lat: 4 }
    expect(ctx.resolveSnapTarget(state, 1, 0, [0, 0], () => candidate)).toEqual(candidate)
  })

  test('insertVertex splits a midpoint into a new vertex, records undo and selects it', () => {
    const { ctx, state, api } = createHarness()
    ctx.insertVertex({ ...state, selectedVertexIndex: state.vertecies.length, selectedVertexType: 'midpoint' }, { key: 'ArrowRight', shiftKey: false })
    expect(api.add).toHaveBeenCalled()
    expect(state.map ?? ctx.map._undoStack.length).toBeGreaterThan(0)
    expect(api.changeMode).toHaveBeenCalledWith('edit_vertex', expect.objectContaining({
      selectedVertexType: 'vertex'
    }))

    // Also works for an open line segment
    const line = createHarness(LINE())
    line.ctx.insertVertex({ ...line.state, selectedVertexIndex: line.state.vertecies.length, selectedVertexType: 'midpoint' }, { key: 'ArrowRight', shiftKey: false })
    expect(line.api.add).toHaveBeenCalled()
  })

  test('insertVertex bails out when the midpoint maps to no segment', () => {
    const { ctx, state, api } = createHarness()
    // midIdx beyond the segment's midpoint count, but with a defined midpoint coord
    const badState = { ...state, selectedVertexIndex: state.vertecies.length + 4, midpoints: [...state.midpoints, [5, 5]] }
    api.add.mockClear()
    ctx.insertVertex(badState, { key: 'ArrowRight', shiftKey: false })
    expect(api.add).not.toHaveBeenCalled()
  })

  test('moveVertex repositions a vertex, applies snap and guards an out-of-range index', () => {
    const { ctx, state, map } = createHarness()
    state.selectedVertexIndex = 0
    ctx.moveVertex(state, { lng: 1, lat: 2 })
    expect(state.vertecies[0]).toEqual([1, 2])

    map._snapInstance = { snapStatus: true, snapCoords: [7, 8] }
    ctx.moveVertex(state, { lng: 1, lat: 2 }, { checkSnap: true })
    expect(state.vertecies[0]).toEqual([7, 8])

    const before = [...state.vertecies]
    ctx.moveVertex({ ...state, selectedVertexIndex: 99 }, { lng: 3, lat: 3 })
    expect(ctx.getVerticies('feat-1')).toEqual(before)

    // checkSnap requested but no active snap → coordinate used as-is
    const h = createHarness()
    h.ctx.moveVertex({ ...h.state, selectedVertexIndex: 0 }, { lng: 1, lat: 2 }, { checkSnap: true })
    expect(h.ctx.getVerticies('feat-1')[0]).toEqual([1, 2])
  })

  test('deleteVertex removes a vertex, or no-ops for missing feature / bad index / minimum size', () => {
    const { ctx, state, api } = createHarness()
    ctx.deleteVertex({ ...state, featureId: 'missing' })
    ctx.deleteVertex({ ...state, selectedVertexIndex: 99 })
    expect(api.changeMode).not.toHaveBeenCalled()

    const triangle = createHarness({ type: 'Polygon', coordinates: [[[0, 0], [10, 0], [5, 10], [0, 0]]] })
    triangle.state.selectedVertexIndex = 0
    triangle.ctx.deleteVertex(triangle.state) // 3 vertices → at minimum, rejected
    expect(triangle.api.changeMode).not.toHaveBeenCalled()

    state.selectedVertexIndex = 1
    ctx.deleteVertex(state)
    expect(ctx.map._undoStack.pop()).toMatchObject({ type: 'delete_vertex', vertexIndex: 1 })
    expect(api.changeMode).toHaveBeenCalledWith('edit_vertex', expect.objectContaining({ selectedVertexIndex: -1 }))

    // Also works on an open line segment
    const line = createHarness(LINE())
    line.state.selectedVertexIndex = 1
    line.ctx.deleteVertex(line.state)
    expect(line.ctx.getVerticies('feat-1')).toHaveLength(2)
  })
})
