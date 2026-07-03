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
