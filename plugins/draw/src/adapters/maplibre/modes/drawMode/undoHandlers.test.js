import { setup, clickAt, firedWith, DrawPolygonMode, DrawLineMode, CENTER } from './__helpers__/harness.js'

describe('cmd/ctrl+z undo', () => {
  const undoKey = (overrides = {}) => {
    const e = new KeyboardEvent('keydown', { key: 'z', metaKey: true, ...overrides })
    e.preventDefault = jest.fn()
    e.stopPropagation = jest.fn()
    return e
  }

  test('removes the last placed vertex without switching to keyboard interface', () => {
    jest.useFakeTimers()
    const { ctx, state, marker } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 10, 10)

    ctx.keydownHandler(undoKey())
    expect(state.polygon.coordinates[0].map(([x]) => x)).toEqual([0, 10, 10])
    expect(state.polygon.coordinates[0]).toHaveLength(3)
    expect(state.interfaceType).toBe('mouse')
    expect(marker.style.display).toBe('none')
    expect(ctx.map._undoInProgress).toBe(true)
    jest.advanceTimersByTime(100)
    expect(ctx.map._undoInProgress).toBe(false)
  })

  test('mouse interface keeps the rubber band on the remaining last vertex', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 10, 10)
    ctx.keydownHandler(undoKey())
    const ring = state.polygon.coordinates[0]
    expect(ring[ring.length - 1]).toEqual(ring[ring.length - 2])
  })

  test('is ignored when typing in an input, when the stack is empty, or for other operations', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    ctx.keydownHandler(undoKey())
    expect(state.polygon.coordinates[0]).toHaveLength(3)
    input.blur()

    ctx.map._undoStack.clear()
    ctx.keydownHandler(undoKey())
    ctx.map._undoStack.push({ type: 'edit_vertex' })
    ctx.keydownHandler(undoKey())
    expect(state.polygon.coordinates[0]).toHaveLength(3)
  })

  test('cmd+shift+z is not treated as undo', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    ctx.keydownHandler(undoKey({ shiftKey: true }))
    expect(state.polygon.coordinates[0]).toHaveLength(3)
  })

  test('ctrl+z (Windows/Linux) also undoes the last vertex', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 10, 10)
    ctx.keydownHandler(undoKey({ metaKey: false, ctrlKey: true }))
    expect(state.polygon.coordinates[0]).toHaveLength(3)
  })
})

describe('undo via draw.undo event and reinitialisation', () => {
  test('draw.undo pops the stack and removes the last vertex; non-draw ops are ignored', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 10, 10)
    // A non-draw op on top of the stack is popped but not undone.
    ctx.map._undoStack.push({ type: 'edit_vertex' })
    ctx.map.fire('draw.undo')
    expect(state.polygon.coordinates[0]).toHaveLength(4)
    // The next op is a draw_vertex → the last vertex is removed.
    ctx.map.fire('draw.undo')
    expect(state.polygon.coordinates[0]).toHaveLength(3)
  })

  test('undo re-validates the committed shape (deferred, phase commit-delete)', () => {
    jest.useFakeTimers()
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 10, 10)
    jest.runAllTimers()
    ctx.map.fire.mockClear()
    ctx.onUndo(state)
    jest.runAllTimers()
    expect(firedWith(ctx.map, 'draw.geometrychange').pop()).toEqual(expect.objectContaining({
      phase: 'commit-delete',
      feature: expect.any(Object)
    }))
    jest.useRealTimers()
  })

  test('keyboard interface moves the rubber band to center after undo', () => {
    const { ctx, state } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 10, 10)
    ctx.undoVertex(state)
    expect(state.polygon.coordinates[0].at(-1)).toEqual([CENTER.lng, CENTER.lat])
  })

  test('undoVertex returns false with nothing placed', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    expect(ctx.undoVertex(state)).toBe(false)
  })

  test('undoing the only polygon vertex reinitialises the feature in place with the same id', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    const id = state.polygon.id
    expect(ctx.undoVertex(state)).toBe(true)
    expect(ctx._ctx.store.delete).toHaveBeenCalledWith([id])
    expect(state.polygon.id).toBe(id)
    expect(state.currentVertexPosition).toBe(0)
    expect(firedWith(ctx.map, 'draw.vertexchange').pop()).toEqual({ numVertecies: 1 })
  })

  test('undoing the only line vertex restarts draw_line with the same feature id', () => {
    const { ctx, state } = setup(DrawLineMode)
    ctx.doClick(state)
    ctx.map._undoStack.push({ type: 'draw_vertex' })
    expect(ctx.undoVertex(state)).toBe(true)
    expect(ctx.map._undoStack.length).toBe(0)
    expect(ctx._ctx.api.changeMode).toHaveBeenCalledWith('draw_line', expect.objectContaining({
      featureId: state.line.id,
      container: state.container,
      properties: state.properties
    }))
  })

  test('Escape (container keyUp) during keyboard drawing clears the undo stack and reinitialises', () => {
    const { ctx, state, container } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    clickAt(ctx, state, 0, 0)
    container.focus()
    const id = state.polygon.id
    ctx.onKeyUp(state, { key: 'Escape' })
    expect(ctx.map._undoStack.length).toBe(0)
    expect(state.polygon.id).toBe(id)
  })

  test('container keyUp defers to the parent mode when focus is elsewhere, and ignores focus inside the container', () => {
    const { ctx, state, button, container } = setup(DrawPolygonMode)
    ctx.onKeyUp(state, { key: 'Enter' }) // focus not on container → parent finishes on Enter
    expect(ctx.changeMode).toHaveBeenCalledWith('simple_select', expect.anything())

    button.focus()
    ctx.changeMode.mockClear()
    ctx.onKeyUp(state, { key: 'Enter' }) // focus on a child element → ignored
    expect(ctx.changeMode).not.toHaveBeenCalled()

    container.focus()
    ctx.onKeyUp(state, { key: 'Escape' }) // non-keyboard Escape → handled by window keyup instead
    expect(ctx._ctx.store.delete).not.toHaveBeenCalled()
  })
})

describe('undo-stack and reinitialisation edge cases', () => {
  test('placing a vertex with no undo stack does not throw and still places the vertex', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    ctx.map._undoStack = null
    clickAt(ctx, state, 0, 0)
    expect(state.polygon.coordinates[0][0]).toEqual([0, 0])
  })

  test('reinitialising a polygon without properties uses an empty properties object', () => {
    const { ctx, state } = setup(DrawPolygonMode, { properties: undefined })
    clickAt(ctx, state, 0, 0)
    expect(ctx.undoVertex(state)).toBe(true)
    expect(state.polygon.properties).toEqual({})
  })

  test('restarting a line with no undo stack still changes mode', () => {
    const { ctx, state } = setup(DrawLineMode)
    ctx.doClick(state)
    ctx.map._undoStack = null
    expect(ctx.undoVertex(state)).toBe(true)
    expect(ctx._ctx.api.changeMode).toHaveBeenCalledWith('draw_line', expect.objectContaining({
      featureId: state.line.id
    }))
  })
})
