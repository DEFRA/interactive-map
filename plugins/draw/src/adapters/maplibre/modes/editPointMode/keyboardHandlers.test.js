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

  test('space prevents the page scrolling — there is nothing to select, the point already is', () => {
    const { ctx, state } = createHarness()
    const e = { key: ' ', preventDefault: jest.fn(), stopPropagation: jest.fn() }
    ctx.onKeydown(state, e)
    expect(e.preventDefault).toHaveBeenCalled()
    expect(state.interfaceType).toBe('keyboard')
  })

  // resolveSnapTarget's own snap/break-out-of-snap branches are covered by
  // utils/snapMovement.test.js — this just checks onKeydown wires an arrow key through to it,
  // records the starting position for undo on the first move, and leaves it fixed for the
  // rest of a held-key sequence.
  test('an arrow key moves the point and starts a keyboard-move undo sequence', () => {
    const { ctx, state } = createHarness()
    keydown(ctx, state, 'ArrowRight')
    expect(state._keyboardMoveStartPosition).toEqual([5, 5])
    expect(state.feature.coordinates).not.toEqual([5, 5])

    keydown(ctx, state, 'ArrowRight') // still held → start position isn't reset
    expect(state._keyboardMoveStartPosition).toEqual([5, 5])
  })

  test('arrow key guards a missing feature', () => {
    const { ctx, state, map } = createHarness()
    keydown(ctx, { ...state, featureId: 'missing' }, 'ArrowRight')
    expect(map._undoStack).toHaveLength(0)
  })

  // isUndoShortcut/handleUndoShortcut's own edge cases (shift, wrong key, text-field focus)
  // are covered by utils/keyboardShortcuts.test.js — this just checks onKeydown wires
  // Cmd/Ctrl+Z through to handleUndo, and that Alt+arrow and Escape are left unbound here.
  test('Cmd/Ctrl+Z undoes; Alt+arrow and Escape are left unbound', () => {
    const { ctx, state } = createHarness()
    const moveSpy = jest.spyOn(ctx, 'movePointByKey').mockImplementation(() => {})
    keydown(ctx, state, 'ArrowRight', { altKey: true })
    expect(moveSpy).toHaveBeenCalled() // Alt is not special-cased — nothing to navigate to

    keydown(ctx, state, 'Escape')
    expect(state.interfaceType).toBe('keyboard') // Escape does nothing but set the interface type

    const undoSpy = jest.spyOn(ctx, 'handleUndo').mockImplementation(() => {})
    keydown(ctx, state, 'z', { metaKey: true })
    expect(undoSpy).toHaveBeenCalledTimes(1)
  })

  test('onKeyup pushes a move undo after a held-arrow sequence, no-ops otherwise, and allows viewport focus', () => {
    const { ctx, state, map } = createHarness()
    state._keyboardMoveStartPosition = [10, 0]
    keyup(ctx, state, 'ArrowRight')
    expect(map._undoStack.pop()).toMatchObject({ type: 'move_point', vertexIndex: 0, previousPosition: [10, 0] })

    keyup(ctx, state, 'ArrowRight') // no active sequence → no undo
    expect(map._undoStack).toHaveLength(0)

    const child = document.createElement('button') // focus inside the viewport is non-blocking
    state.container.appendChild(child)
    child.focus()
    keyup(ctx, state, 'ArrowRight')
    expect(state.interfaceType).toBe('keyboard')

    // A non-arrow key just tracks the interface type, nothing else
    keyup(ctx, state, 'z')
    expect(map._undoStack).toHaveLength(0)
  })
})
