import { createHarness } from './__helpers__/harness.js'

describe('keyboardHandlers', () => {
  const keydown = (ctx, state, key, extra = {}) => ctx.onKeydown(state, { key, preventDefault: jest.fn(), stopPropagation: jest.fn(), ...extra })
  const keyup = (ctx, state, key) => ctx.onKeyup(state, { key, stopPropagation: jest.fn() })

  // isInteractiveElementFocused's own branches are covered by utils/keyboardShortcuts.test.js
  // — this just checks onKeydown/onKeyup actually consult it.
  test('shortcuts are ignored while a form control outside the viewport has focus', () => {
    const { ctx, state } = createHarness()
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    keydown(ctx, state, 'ArrowRight')
    keyup(ctx, state, 'ArrowRight')
    expect(state.interfaceType).not.toBe('keyboard')
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

  // resolveSnapTarget's own snap/break-out-of-snap branches are covered by
  // utils/snapMovement.test.js — this just checks onKeydown wires an arrow key through to it,
  // records the starting position/index for undo on the first move, and leaves it fixed for
  // the rest of a held-key sequence.
  test('an arrow key moves the selected vertex and starts a keyboard-move undo sequence', () => {
    const { ctx, state } = createHarness()
    state.selectedVertexIndex = 1
    keydown(ctx, state, 'ArrowRight')
    expect(state._keyboardMoveStartIndex).toBe(1)
    expect(state._keyboardMoveStartPosition).toEqual([10, 0])
    expect(state.vertecies[1]).not.toEqual([10, 0])

    // Still held → start position isn't reset to the intermediate (already-moved) position
    keydown(ctx, state, 'ArrowRight')
    expect(state._keyboardMoveStartPosition).toEqual([10, 0])
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

  // isUndoShortcut/handleUndoShortcut's own edge cases (shift, wrong key, text-field focus)
  // are covered by utils/keyboardShortcuts.test.js — this just checks onKeydown wires
  // Cmd/Ctrl+Z through to handleUndo, and the alt+arrow/Escape behaviour that's specific here.
  test('alt+arrow steps the selection, Escape clears it, and Cmd/Ctrl+Z undoes', () => {
    const { ctx, state, api } = createHarness()
    state.selectedVertexIndex = 0
    const updateSpy = jest.spyOn(ctx, 'updateVertex').mockImplementation(() => {})
    keydown(ctx, state, 'ArrowRight', { altKey: true })
    expect(updateSpy).toHaveBeenCalledWith(state, 'ArrowRight')

    keydown(ctx, state, 'Escape')
    expect(api.changeMode).toHaveBeenCalledWith('edit_vertex', expect.objectContaining({ isPanEnabled: true }))

    // An unhandled key (not space/arrow/Escape/undo) falls all the way through harmlessly —
    // unlike editPointMode, Escape returns early here, so this is the only path that reaches
    // isUndoShortcut with a falsy result.
    expect(() => keydown(ctx, state, 'x')).not.toThrow()

    const undoSpy = jest.spyOn(ctx, 'handleUndo').mockImplementation(() => {})
    keydown(ctx, state, 'z', { metaKey: true })
    expect(undoSpy).toHaveBeenCalledTimes(1)
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
