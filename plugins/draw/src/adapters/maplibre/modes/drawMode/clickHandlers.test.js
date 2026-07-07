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

  test('rejects a click that would make the drawn path cross itself', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 10)
    clickAt(ctx, state, 10, 0)
    const lenBefore = state.polygon.coordinates[0].length
    clickAt(ctx, state, 0, 10) // the new edge would cross the (0,0)-(10,10) edge
    expect(state.polygon.coordinates[0].length).toBe(lenBefore) // vertex never placed
  })

  test('a rejected placement fires draw.placementblocked with the reason', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 10)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 0, 10)
    expect(firedWith(ctx.map, 'draw.placementblocked').pop()).toEqual(expect.objectContaining({
      kind: 'place',
      mode: 'draw_polygon',
      vertexIndex: 3,
      reason: expect.any(String),
      feature: expect.objectContaining({ type: 'Feature' })
    }))
  })

  test('the user callback can veto a mouse placement (and receives kind "place")', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    ctx.map._drawGeometryValidator = jest.fn((feature, context) =>
      context.kind === 'place' ? { valid: false, reason: 'outside region' } : { valid: true })
    clickAt(ctx, state, 0, 0)
    expect(state.polygon.coordinates[0]).toHaveLength(0) // first vertex vetoed
    expect(firedWith(ctx.map, 'draw.placementblocked').pop()).toEqual(
      expect.objectContaining({ reason: 'outside region', vertexIndex: 0 }))
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

  test('placing a vertex emits a deferred commit-level geometrychange for validation', () => {
    jest.useFakeTimers()
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    jest.runAllTimers()
    const geomChange = firedWith(ctx.map, 'draw.geometrychange').pop()
    expect(geomChange).toEqual(expect.objectContaining({ kind: 'add', feature: expect.any(Object) }))
    jest.useRealTimers()
  })

  test('emitDrawValidation does not fire without a feature', () => {
    jest.useFakeTimers()
    const { ctx } = setup(DrawPolygonMode)
    ctx.emitDrawValidation({}) // no polygon on the state
    jest.runAllTimers()
    expect(firedWith(ctx.map, 'draw.geometrychange')).toHaveLength(0)
    jest.useRealTimers()
  })

  test('a line placement emits a LineString geometrychange', () => {
    jest.useFakeTimers()
    const { ctx, state } = setup(DrawLineMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    jest.runAllTimers()
    const geom = firedWith(ctx.map, 'draw.geometrychange').pop()
    expect(geom.feature.geometry.type).toBe('LineString')
    jest.useRealTimers()
  })

  test('blocks a close gesture (vertex click) while the geometry is invalid', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 5, 10)
    ctx.map._drawGeometryValid = false
    const lenBefore = state.polygon.coordinates[0].length
    ctx.onClick(state, { ...clickEvent(ctx, 0, 0), featureTarget: { properties: { meta: 'vertex' } } })
    expect(state.polygon.coordinates[0].length).toBe(lenBefore) // finish gesture ignored
    expect(firedWith(ctx.map, 'draw.create')).toHaveLength(0)
  })
})

describe('add-vertex button and doClick', () => {
  test('clicking the add-vertex button places a vertex at map center', () => {
    const { ctx, state, button } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    ctx.vertexButtonClickHandler({ target: button })
    expect(state.polygon.coordinates[0][0]).toEqual([CENTER.lng, CENTER.lat])
    expect(ctx.map._undoStack.length).toBe(1)
  })

  test('does not finish a line via doClick while the geometry is invalid', () => {
    const { ctx, state } = setup(DrawLineMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    ctx.map._drawGeometryValid = false
    // Rubber-band duplicates the last placed vertex → a finish gesture.
    state.line.setCoordinates([[0, 0], [10, 0], [10, 0]])
    ctx.doClick(state)
    expect(firedWith(ctx.map, 'draw.create')).toHaveLength(0)
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

  test('doClick rejects a placement that would make the drawn path cross itself', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 10, -10)
    const lenBefore = state.polygon.coordinates[0].length
    ctx.doClick(state) // map centre is (5,5): the new edge would cross (0,0)-(10,0)
    expect(state.polygon.coordinates[0].length).toBe(lenBefore)
    expect(firedWith(ctx.map, 'draw.placementblocked').length).toBeGreaterThan(0)
  })

  test('the user callback can veto a doClick placement', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    ctx.map._drawGeometryValidator = () => ({ valid: false, reason: 'outside region' })
    ctx.doClick(state)
    expect(state.polygon.coordinates[0]).toHaveLength(0)
    expect(firedWith(ctx.map, 'draw.placementblocked').pop()).toEqual(
      expect.objectContaining({ reason: 'outside region', kind: 'place' }))
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
