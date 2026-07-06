import { createHarness, dragEvt } from './__helpers__/harness.js'

describe('pointerHandlers', () => {
  test('onMouseDown selects a vertex and records the move start, ignoring empty/no-coord targets', () => {
    const { ctx, state } = createHarness()
    ctx.onMouseDown(state, { lngLat: { lng: 10, lat: 0 }, featureTarget: { properties: { meta: 'vertex', coord_path: '0.1' } } })
    expect(state.selectedVertexIndex).toBe(1)
    expect(state._moveStartIndex).toBe(1)

    const h = createHarness()
    h.ctx.onMouseDown(h.state, { lngLat: { lng: 0, lat: 0 }, featureTarget: undefined })
    h.ctx.onMouseDown(h.state, { lngLat: { lng: 0, lat: 0 }, featureTarget: { properties: { meta: 'vertex', coord_path: '0.9' } } })
    expect(h.state._moveStartIndex).toBeUndefined()
  })

  test('onMouseDown on a midpoint marks an insertion in progress', () => {
    const { ctx, state, map } = createHarness()
    ctx.onMouseDown(state, { lngLat: { lng: 5, lat: 0 }, featureTarget: { properties: { meta: 'midpoint', coord_path: '0.1', lng: 5, lat: 0 } } })
    expect(state._isInsertingVertex).toBe(true)
    expect(map.fire).toHaveBeenCalledWith('draw.vertexselection', expect.any(Object))
  })

  test('onClick commits an in-progress insertion, otherwise delegates to DirectSelect', () => {
    const { ctx, state, api } = createHarness()
    state._isInsertingVertex = true
    state._insertedVertexIndex = 2
    ctx.onClick(state, {})
    expect(ctx.map._undoStack.pop()).toMatchObject({ type: 'insert_vertex', vertexIndex: 2 })
    expect(state._isInsertingVertex).toBe(false)

    ctx.onClick(state, { featureTarget: undefined }) // noTarget → clickNoTarget → changeMode
    expect(api.changeMode).toHaveBeenCalledWith('edit_vertex', expect.objectContaining({ selectedVertexIndex: -1 }))
  })

  test('onMouseUp records a move undo, an insertion undo, or nothing', () => {
    const { ctx, state, map } = createHarness()
    // nothing
    ctx.onMouseUp(state, {})
    expect(map._undoStack.length).toBe(0)

    // move
    state._moveStartIndex = 1
    state._moveStartPosition = [10, 0]
    ctx.moveVertex({ ...state, selectedVertexIndex: 1 }, { lng: 3, lat: 3 })
    ctx.onMouseUp(state, {})
    expect(map._undoStack.pop()).toMatchObject({ type: 'move_vertex', vertexIndex: 1 })

    // insertion
    state.dragMoving = true
    state._isInsertingVertex = true
    state._insertedVertexIndex = 2
    ctx.onMouseUp(state, {})
    expect(map._undoStack.pop()).toMatchObject({ type: 'insert_vertex', vertexIndex: 2 })

    // In-progress drag with no move/insertion records nothing; guards missing feature/stale index; detects a vertical-only move
    const h = createHarness()
    h.ctx.onMouseUp({ ...h.state, dragMoving: true }, {})
    h.ctx.onMouseUp({ ...h.state, _moveStartPosition: [0, 0], _moveStartIndex: 0, featureId: 'missing' }, {})
    h.ctx.onMouseUp({ ...h.state, _moveStartPosition: [0, 0], _moveStartIndex: 99 }, {})
    expect(h.map._undoStack.length).toBe(0)
    h.ctx.moveVertex({ ...h.state, selectedVertexIndex: 1 }, { lng: 10, lat: 5 }) // same lng, new lat
    h.ctx.onMouseUp({ ...h.state, _moveStartPosition: [10, 0], _moveStartIndex: 1 }, {})
    expect(h.map._undoStack.pop()).toMatchObject({ type: 'move_vertex', vertexIndex: 1 })
  })

  test('onDrag skips touch, delegates without snap, and snaps when enabled', () => {
    const { ctx, state, map } = createHarness()
    ctx.onDrag({ ...state, interfaceType: 'touch' }, { originalEvent: { stopPropagation: jest.fn() }, lngLat: { lng: 1, lat: 1 }, point: { x: 10, y: 10 } })

    // no snap → DirectSelect.onDrag moves the vertex
    Object.assign(state, { canDragMove: true, selectedCoordPaths: ['0.1'], dragMoveLocation: { lng: 0, lat: 0 } })
    ctx.onDrag(state, { originalEvent: { stopPropagation: jest.fn() }, lngLat: { lng: 2, lat: 2 }, point: { x: 20, y: 20 } })
    expect(map.fire).toHaveBeenCalledWith('draw.geometrychange', expect.anything())

    // snap enabled
    state.getSnapEnabled = () => true
    map._snapInstance = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() }
    ctx.onDrag(state, { originalEvent: { stopPropagation: jest.fn() }, lngLat: { lng: 3, lat: 3 }, point: { x: 30, y: 30 } })
    expect(state.dragMoving).toBe(true)

    // Snapping enabled but nothing selected → bail out
    const nosel = createHarness()
    nosel.map._snapInstance = { status: true, snapStatus: true, snapCoords: [1, 1] }
    const ns = { ...nosel.state, getSnapEnabled: () => true, selectedCoordPaths: [], canDragMove: false }
    nosel.ctx.onDrag(ns, dragEvt(1, 1))
    expect(ns.dragMoving).not.toBe(true)

    // Snapping active → snapped point; inactive → raw point
    const snapped = createHarness()
    snapped.map._snapInstance = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn(() => { snapped.map._snapInstance.snapStatus = true; snapped.map._snapInstance.snapCoords = [7, 8] }) }
    snapped.ctx.onDrag({ ...snapped.state, getSnapEnabled: () => true, selectedCoordPaths: ['0.1'], canDragMove: true }, dragEvt(2, 2))
    expect(snapped.ctx.getFeature('feat-1').getCoordinate('0.1')).toEqual([7, 8])
    const raw = createHarness()
    raw.map._snapInstance = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() }
    raw.ctx.onDrag({ ...raw.state, getSnapEnabled: () => true, selectedCoordPaths: ['0.1'], canDragMove: true }, dragEvt(3, 3))
    expect(raw.ctx.getFeature('feat-1').getCoordinate('0.1')).toEqual([3, 3])
  })
})
