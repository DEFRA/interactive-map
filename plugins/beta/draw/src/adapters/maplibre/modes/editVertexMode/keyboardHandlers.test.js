import { createHarness } from './__helpers__/harness.js'

describe('keyboardHandlers', () => {
  const keydown = (ctx, state, key, extra = {}) => ctx.onKeydown(state, { key, preventDefault: jest.fn(), stopPropagation: jest.fn(), ...extra })
  const keyup = (ctx, state, key) => ctx.onKeyup(state, { key, stopPropagation: jest.fn() })

  test('shortcuts are ignored outside the viewport (input, focusable non-input) and when the container is absent', () => {
    const { ctx, state } = createHarness()
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    keydown(ctx, state, 'ArrowRight')
    keyup(ctx, state, 'ArrowRight')
    expect(state.interfaceType).not.toBe('keyboard')

    const focusable = document.createElement('div')
    focusable.tabIndex = 0
    document.body.appendChild(focusable)
    focusable.focus()
    keydown(ctx, state, 'ArrowRight')
    expect(state.interfaceType).not.toBe('keyboard')

    input.focus()
    const s = { ...state, container: undefined, interfaceType: 'mouse' }
    keydown(ctx, s, 'ArrowRight')
    expect(s.interfaceType).toBe('mouse')
  })

  test('space selects the first vertex, or does nothing when a vertex is selected or there are none', () => {
    const { ctx, state, map } = createHarness()
    map._snapInstance = { status: true, snapStatus: true, snapCoords: [1, 1] }
    const updateSpy = jest.spyOn(ctx, 'updateVertex').mockImplementation(() => {})
    keydown(ctx, state, ' ')
    expect(state.isPanEnabled).toBe(false)
    expect(updateSpy).toHaveBeenCalledTimes(1)

    keydown(ctx, { ...state, selectedVertexIndex: 0 }, ' ') // already selected → just cancels default
    expect(updateSpy).toHaveBeenCalledTimes(1)

    map._snapInstance = null // no snap indicator to clear
    const s = { ...state, featureId: 'missing', vertecies: [], selectedVertexIndex: -1, isPanEnabled: true }
    keydown(ctx, s, ' ')
    expect(s.isPanEnabled).toBe(true)
  })

  test('an arrow key moves the selected vertex, snapping when active and using the raw coord otherwise', () => {
    const { ctx, state, map } = createHarness()
    state.selectedVertexIndex = 1
    keydown(ctx, state, 'ArrowRight')
    expect(state._keyboardMoveStartIndex).toBe(1)

    state.getSnapEnabled = () => true
    map._snapInstance = { status: true, snapStatus: true, snapCoords: [7, 8], snapToClosestPoint: jest.fn() }
    keydown(ctx, state, 'ArrowUp')
    expect(state._isSnapped).toBe(true)
    expect(state.vertecies[1]).toEqual([7, 8])

    keydown(ctx, state, 'ArrowLeft') // snapped already → break out of the snap radius
    expect(state._isSnapped).toBe(false)

    map._snapInstance = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() }
    keydown(ctx, state, 'ArrowRight') // snap enabled but inactive → raw new coord
    expect(state._isSnapped).toBe(false)
  })

  test('an arrow key on a midpoint inserts a vertex; guards a missing feature or out-of-range vertex', () => {
    const { ctx, state } = createHarness()
    const insertSpy = jest.spyOn(ctx, 'insertVertex').mockImplementation(() => {})
    keydown(ctx, { ...state, selectedVertexIndex: state.vertecies.length, selectedVertexType: 'midpoint' }, 'ArrowRight')
    expect(insertSpy).toHaveBeenCalled()

    keydown(ctx, { ...state, featureId: 'missing', selectedVertexIndex: 0 }, 'ArrowRight')
    keydown(ctx, { ...state, selectedVertexIndex: 99 }, 'ArrowRight')
    expect(ctx.map._undoStack.length).toBe(0)
  })

  test('alt+arrow steps the selection, Escape clears it, and Cmd/Ctrl+Z undoes (ignoring shift and text fields)', () => {
    const { ctx, state, api } = createHarness()
    state.selectedVertexIndex = 0
    const updateSpy = jest.spyOn(ctx, 'updateVertex').mockImplementation(() => {})
    keydown(ctx, state, 'ArrowRight', { altKey: true })
    expect(updateSpy).toHaveBeenCalledWith(state, 'ArrowRight')

    keydown(ctx, state, 'Escape')
    expect(api.changeMode).toHaveBeenCalledWith('edit_vertex', expect.objectContaining({ isPanEnabled: true }))

    const undoSpy = jest.spyOn(ctx, 'handleUndo').mockImplementation(() => {})
    keydown(ctx, state, 'z', { metaKey: true })
    keydown(ctx, state, 'z', { ctrlKey: true })
    expect(undoSpy).toHaveBeenCalledTimes(2)
    keydown(ctx, state, 'z', { metaKey: true, shiftKey: true }) // shift → not undo
    expect(undoSpy).toHaveBeenCalledTimes(2)

    // Ignored while typing in a text field inside the viewport
    const input = document.createElement('input')
    state.container.appendChild(input)
    input.focus()
    keydown(ctx, state, 'z', { metaKey: true })
    expect(undoSpy).toHaveBeenCalledTimes(2)
  })

  test('onKeyup pushes a move undo after a sequence, deletes on Delete, no-ops otherwise, and allows viewport focus', () => {
    const { ctx, state, map } = createHarness()
    state.selectedVertexIndex = 1
    state._keyboardMoveStartPosition = [10, 0]
    state._keyboardMoveStartIndex = 1
    keyup(ctx, state, 'ArrowRight')
    expect(map._undoStack.pop()).toMatchObject({ type: 'move_vertex', vertexIndex: 1 })

    keyup(ctx, { ...state, selectedVertexIndex: 1 }, 'ArrowRight') // no active sequence → no undo
    expect(map._undoStack.length).toBe(0)

    const deleteSpy = jest.spyOn(ctx, 'deleteVertex').mockImplementation(() => {})
    keyup(ctx, state, 'Delete')
    expect(deleteSpy).toHaveBeenCalled()

    const child = document.createElement('button') // focus inside the viewport is non-blocking
    state.container.appendChild(child)
    child.focus()
    keyup(ctx, state, 'ArrowRight')
    expect(state.interfaceType).toBe('keyboard')
  })
})
