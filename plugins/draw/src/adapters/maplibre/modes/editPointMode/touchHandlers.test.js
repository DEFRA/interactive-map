import { createHarness, svgTarget } from './__helpers__/harness.js'

describe('touchHandlers', () => {
  test('addTouchPointTarget resolves colours from map._drawPluginConfig', () => {
    const { ctx, state, map } = createHarness()
    map._drawPluginConfig = { editVertex: '#custom' }
    ctx.addTouchPointTarget(state)
    expect(state.touchPointTarget.style.getPropertyValue('--draw-primary')).toBe('#custom')
  })

  test('updateTouchPointTarget shows the target for a touch selection and hides it otherwise', () => {
    const { ctx, state } = createHarness()
    state.interfaceType = 'touch'
    ctx.updateTouchPointTarget(state, { x: 12, y: 34 })
    expect(state.touchPointTarget.style.display).toBe('block')
    ctx.updateTouchPointTarget(state, null)
    expect(state.touchPointTarget.style.display).toBe('none')
  })

  test('hideTouchPointIndicator hides the target', () => {
    const { ctx, state } = createHarness()
    state.touchPointTarget.style.display = 'block'
    ctx.hideTouchPointIndicator(state)
    expect(state.touchPointTarget.style.display).toBe('none')
  })

  test('onPointerevent only tracks the interface type — the point is always selected, so there is nothing to deselect', () => {
    const { ctx, state, api } = createHarness()
    ctx.onPointerevent(state, { pointerType: 'mouse' })
    expect(state.interfaceType).toBe('mouse')
    expect(api.changeMode).not.toHaveBeenCalled()

    ctx.onPointerevent(state, { pointerType: 'touch' })
    expect(state.interfaceType).toBe('touch')
    expect(api.changeMode).not.toHaveBeenCalled()
  })

  test('onTap is a deliberate no-op — a stray tap never relocates the point', () => {
    const { ctx, state, map } = createHarness()
    const before = [...state.feature.coordinates]
    expect(() => ctx.onTap(state, { featureTarget: undefined })).not.toThrow()
    expect(state.feature.coordinates).toEqual(before)
    expect(map.fire).not.toHaveBeenCalledWith('draw.geometrychange', expect.anything())
  })

  test('onTouchend records a move undo only when a touch move occurred', () => {
    const { ctx, state, map } = createHarness()
    ctx.onTouchend({}) // no state → no throw
    ctx.onTouchend({ ...state, _touchMoved: false }) // no move → no undo
    expect(map._undoStack).toHaveLength(0)
    state._touchMoved = true
    state._moveStartPosition = [0, 0]
    ctx.onTouchend(state)
    expect(map._undoStack.pop()).toMatchObject({ type: 'move_point', vertexIndex: 0, previousPosition: [0, 0] })
    expect(state._moveStartPosition).toBeNull()
  })

  // Regression: mid-drag the target tracks the raw finger 1:1 from its touchstart-time offset
  // (see onTouchmove), so a mid-drag snap — which moves the point without moving the target by
  // the same amount — leaves the two out of alignment. Re-syncing on touchend to the point's
  // actual final coordinate stops that drift from compounding on the next drag's delta math.
  test('onTouchend re-syncs the target to the point\'s actual final coordinate', () => {
    const { ctx, state } = createHarness()
    state.interfaceType = 'touch'
    state.feature.coordinates = [9, 9]
    ctx.onTouchend(state)
    expect(state.touchPointTarget.style.display).toBe('block')
    expect(state.touchPointTarget.style.left).toBe(`${9 * 10}px`) // harness project(): coord * 10
    expect(state.touchPointTarget.style.top).toBe(`${9 * 10}px`)
  })

  test('onTouchstart captures move start state, ignoring taps off the point/target', () => {
    const { ctx, state } = createHarness()
    ctx.onTouchstart(state, { target: { parentNode: document.createElement('div') }, touches: [{ clientX: 1, clientY: 1 }] })
    expect(state._moveStartPosition).toBeUndefined()

    ctx.onTouchstart(state, { target: svgTarget(state), touches: [{ clientX: 20, clientY: 20 }] })
    expect(state._moveStartPosition).toEqual([5, 5])
    expect(state._touchMoved).toBe(false)
  })

  // resolveTouchDragCoord's own snap/fallback branches are covered by
  // utils/touchDragMath.test.js — this checks onTouchmove ignores off-target moves and wires
  // an active snap through to the point's coordinate.
  test('onTouchmove moves the point, honouring snap, and ignores non-target moves', () => {
    const { ctx, state, map } = createHarness()
    ctx.onTouchstart(state, { target: svgTarget(state), touches: [{ clientX: 50, clientY: 50 }] })

    ctx.onTouchmove(state, { target: { parentNode: document.createElement('div') }, touches: [{ clientX: 5, clientY: 5 }] })
    expect(state.feature.coordinates).toEqual([5, 5]) // off-target move ignored

    ctx.onTouchmove(state, { target: svgTarget(state), touches: [{ clientX: 60, clientY: 70 }] })
    expect(state.feature.coordinates).not.toEqual([5, 5])
    expect(state._touchMoved).toBe(true)

    state.getSnapEnabled = () => true
    map._snapInstance = { status: true, snapStatus: true, snapCoords: [7, 8], snapToClosestPoint: jest.fn() }
    ctx.onTouchmove(state, { target: svgTarget(state), touches: [{ clientX: 80, clientY: 90 }] })
    expect(state.feature.coordinates).toEqual([7, 8])
  })
})
