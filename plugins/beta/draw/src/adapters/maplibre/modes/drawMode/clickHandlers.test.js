import { setup, clickAt, clickEvent, firedWith, activeSnap, DrawPolygonMode, DrawLineMode, CENTER } from './__helpers__/harness.js'

describe('mouse clicks (polygon)', () => {
  test('each click at a new position places a vertex, fires vertexchange and pushes an undo op', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)

    // Ring is [v0, v1, rubber_band]
    expect(state.polygon.coordinates[0]).toHaveLength(3)
    expect(state.polygon.coordinates[0][0]).toEqual([0, 0])
    expect(state.polygon.coordinates[0][1]).toEqual([10, 0])
    expect(firedWith(ctx.map, 'draw.vertexchange').pop()).toEqual({ numVertecies: 2 })
    expect(ctx.map._undoStack.length).toBe(2)
  })

  test('clicking the same position again is rejected', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 0, 0)
    expect(state.polygon.coordinates[0]).toHaveLength(2)
    expect(ctx.map._undoStack.length).toBe(1)
  })

  test('non-primary buttons, undo-in-progress and off-canvas clicks are ignored', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    ctx.onClick(state, clickEvent(ctx, 0, 0, { button: 2 }))
    ctx.map._undoInProgress = true
    clickAt(ctx, state, 0, 0)
    ctx.map._undoInProgress = false
    ctx.onClick(state, clickEvent(ctx, 0, 0, { target: document.body }))
    expect(state.polygon.coordinates[0]).toHaveLength(0)
  })

  test('with snap active the vertex is placed at the snapped position', () => {
    const { ctx, state } = setup(DrawPolygonMode, { getSnapEnabled: () => true })
    ctx.map._snapInstance = activeSnap()
    clickAt(ctx, state, 0, 0)
    expect(state.polygon.coordinates[0][0]).toEqual([9, 9])
  })

  test('onTap is disabled', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    expect(ctx.onTap(state, clickEvent(ctx, 0, 0))).toBeUndefined()
    expect(state.polygon.coordinates[0]).toHaveLength(0)
  })
})

describe('add-vertex button and doClick', () => {
  test('clicking the add-vertex button places a vertex at map center', () => {
    const { ctx, state, button } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    ctx.vertexButtonClickHandler({ target: button })
    expect(state.polygon.coordinates[0][0]).toEqual([CENTER.lng, CENTER.lat])
    expect(ctx.map._undoStack.length).toBe(1)
  })

  test('clicks elsewhere, without a button id, or during undo do nothing', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    ctx.vertexButtonClickHandler({ target: document.body })
    ctx.map._undoInProgress = true
    ctx.doClick(state)
    ctx.map._undoInProgress = false
    const noButton = setup(DrawPolygonMode, { addVertexButtonId: null })
    noButton.ctx.vertexButtonClickHandler({ target: document.body })
    expect(state.polygon.coordinates[0]).toHaveLength(0)
    expect(noButton.state.polygon.coordinates[0]).toHaveLength(0)
  })

  test('doClick places at the snapped position when snapping', () => {
    const { ctx, state } = setup(DrawPolygonMode, { getSnapEnabled: () => true })
    ctx.map._snapInstance = activeSnap()
    ctx.doClick(state)
    expect(state.polygon.coordinates[0][0]).toEqual([9, 9])
    expect(ctx._ctx.store.render).toHaveBeenCalled()
  })

  test('line: activating add-vertex at the same spot twice finishes the line', () => {
    const { ctx, state } = setup(DrawLineMode)
    ctx.doClick(state)
    ctx.doClick(state)
    expect(firedWith(ctx.map, 'draw.create')).toHaveLength(1)
    expect(ctx.changeMode).toHaveBeenCalledWith('simple_select', { featureIds: [state.line.id] })
  })

  test('polygon: a repeated add-vertex at the same spot is rejected without finishing', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    ctx.doClick(state)
    ctx.doClick(state)
    expect(firedWith(ctx.map, 'draw.create')).toHaveLength(0)
    expect(ctx.changeMode).not.toHaveBeenCalled()
  })
})

describe('line mode mouse interactions', () => {
  test('mouse clicks place line vertices; moving then undoing keeps the rubber band on the last vertex', () => {
    const { ctx, state } = setup(DrawLineMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 10, 10)
    expect(state.line.coordinates.map(([x]) => x)).toEqual([0, 10, 10, 10]) // 3 placed + rubber band

    ctx.onMouseMove(state, { lngLat: { lng: 3, lat: 3 }, point: { x: 3, y: 3 } })
    expect(state.line.coordinates.at(-1)).toEqual([3, 3])
    expect(firedWith(ctx.map, 'draw.geometrychange').length).toBeGreaterThan(0)

    ctx.map._undoStack.push({ type: 'draw_vertex' })
    ctx.undoVertex(state)
    const coords = state.line.coordinates
    expect(coords[coords.length - 1]).toEqual(coords[coords.length - 2])
  })

  test('a repeated mouse click at the last vertex adds no new vertex and does not finish the line', () => {
    const { ctx, state } = setup(DrawLineMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    const before = state.line.coordinates.length
    clickAt(ctx, state, 10, 0)
    expect(state.line.coordinates.length).toBe(before)
    expect(firedWith(ctx.map, 'draw.create')).toHaveLength(0)
  })
})

describe('onCreate (draw.create re-id)', () => {
  test('re-ids the created feature to the requested featureId', () => {
    const { ctx } = setup(DrawPolygonMode)
    const feature = { id: 'temp-id' }
    ctx.map.fire('draw.create', { features: [feature] })
    expect(ctx._ctx.api.delete).toHaveBeenCalledWith('temp-id')
    expect(feature.id).toBe('shape-1')
    expect(ctx._ctx.api.add).toHaveBeenCalledWith(feature, { userProperties: true })
  })
})
