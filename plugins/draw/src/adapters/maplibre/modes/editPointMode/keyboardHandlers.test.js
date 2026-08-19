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

  // Regression: onSetup now claims focus on the container itself, so document.body is never
  // naturally document.activeElement in any other test here — covering it explicitly keeps
  // isInteractiveElementFocused's !el/=== document.body early-outs exercised.
  test('shortcuts still work when focus has moved to document.body (e.g. after a blur)', () => {
    const { ctx, state } = createHarness()
    state.container.blur()
    expect(document.activeElement).toBe(document.body)
    keydown(ctx, state, 'ArrowRight')
    expect(state.interfaceType).toBe('keyboard')
  })

  test('space prevents the page scrolling — there is nothing to select, the point already is', () => {
    const { ctx, state } = createHarness()
    const e = { key: ' ', preventDefault: jest.fn(), stopPropagation: jest.fn() }
    ctx.onKeydown(state, e)
    expect(e.preventDefault).toHaveBeenCalled()
    expect(state.interfaceType).toBe('keyboard')
  })

  test('an arrow key moves the point, snapping when active and using the raw coord otherwise', () => {
    const { ctx, state, map } = createHarness()
    keydown(ctx, state, 'ArrowRight')
    expect(state._keyboardMoveStartPosition).toEqual([5, 5])

    state.getSnapEnabled = () => true
    map._snapInstance = { status: true, snapStatus: true, snapCoords: [7, 8], snapToClosestPoint: jest.fn() }
    keydown(ctx, state, 'ArrowUp')
    expect(state._isSnapped).toBe(true)
    expect(state.feature.coordinates).toEqual([7, 8])

    keydown(ctx, state, 'ArrowLeft') // snapped already → break out of the snap radius
    expect(state._isSnapped).toBe(false)

    map._snapInstance = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() }
    keydown(ctx, state, 'ArrowRight') // snap enabled but inactive → raw new coord
    expect(state._isSnapped).toBe(false)
  })

  test('arrow key guards a missing feature', () => {
    const { ctx, state, map } = createHarness()
    keydown(ctx, { ...state, featureId: 'missing' }, 'ArrowRight')
    expect(map._undoStack).toHaveLength(0)
  })

  test('Cmd/Ctrl+Z undoes (ignoring shift and text fields); Alt+arrow and Escape are left unbound', () => {
    const { ctx, state } = createHarness()
    const moveSpy = jest.spyOn(ctx, 'movePointByKey').mockImplementation(() => {})
    keydown(ctx, state, 'ArrowRight', { altKey: true })
    expect(moveSpy).toHaveBeenCalled() // Alt is not special-cased — nothing to navigate to

    keydown(ctx, state, 'Escape')
    expect(state.interfaceType).toBe('keyboard') // Escape does nothing but set the interface type

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
