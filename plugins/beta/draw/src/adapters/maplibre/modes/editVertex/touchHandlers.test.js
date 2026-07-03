import { createHarness, svgTarget } from './__helpers__/harness.js'
import { applyTouchVertexColors } from './touchHandlers.js'

describe('touchHandlers', () => {
  test('applyTouchVertexColors returns early for a null element and defaults the colour scheme', () => {
    expect(() => applyTouchVertexColors(null, {})).not.toThrow()
    const { state } = createHarness()
    expect(() => applyTouchVertexColors(state.touchVertexTarget, null)).not.toThrow()
  })

  test('updateTouchVertexTarget shows the target for a touch selection and hides it otherwise', () => {
    const { ctx, state } = createHarness()
    state.interfaceType = 'touch'
    state.selectedVertexIndex = 0
    ctx.updateTouchVertexTarget(state, { x: 12, y: 34 })
    expect(state.touchVertexTarget.style.display).toBe('block')
    ctx.updateTouchVertexTarget(state, null)
    expect(state.touchVertexTarget.style.display).toBe('none')
  })

  test('onPointerevent deselects on touch drag off the target, and just tracks the interface for mouse', () => {
    const { ctx, state, api } = createHarness()
    ctx.onPointerevent(state, { pointerType: 'mouse', type: 'pointermove', target: { parentNode: document.createElement('div') } })
    expect(state.interfaceType).toBe('mouse')
    expect(api.changeMode).not.toHaveBeenCalled()

    state._ignorePointermoveDeselect = false
    ctx.onPointerevent(state, { pointerType: 'touch', type: 'pointermove', target: { parentNode: document.createElement('div') } })
    expect(state.interfaceType).toBe('touch')
    expect(api.changeMode).toHaveBeenCalledWith('edit_vertex', expect.objectContaining({ selectedVertexIndex: -1 }))
  })

  test('onTouchend records a move undo only when a touch move occurred', () => {
    const { ctx, state, map } = createHarness()
    ctx.onTouchend({ }) // no featureId → no-op
    ctx.onTouchend({ ...state, _touchMoved: false }) // feature but no move → no undo
    expect(map._undoStack.length).toBe(0)
    state._touchMoved = true
    state._moveStartPosition = [0, 0]
    state._moveStartIndex = 1
    ctx.onTouchend(state)
    expect(map._undoStack.pop()).toMatchObject({ type: 'move_vertex', vertexIndex: 1 })
  })

  test('onTouchstart captures move start state, ignoring taps off the vertex/target', () => {
    const { ctx, state } = createHarness()
    ctx.onTouchstart(state, { target: { parentNode: document.createElement('div') }, touches: [{ clientX: 1, clientY: 1 }] })
    expect(state._moveStartIndex).toBeUndefined()

    state.selectedVertexIndex = 1
    ctx.onTouchstart(state, { target: svgTarget(state), touches: [{ clientX: 20, clientY: 20 }] })
    expect(state._moveStartIndex).toBe(1)
    expect(state._touchMoved).toBe(false)
  })

  test('onTouchmove moves the selected vertex, honouring snap, and ignores non-target moves', () => {
    const { ctx, state, map } = createHarness()
    state.selectedVertexIndex = 1
    ctx.onTouchstart(state, { target: svgTarget(state), touches: [{ clientX: 20, clientY: 20 }] })

    ctx.onTouchmove(state, { target: { parentNode: document.createElement('div') }, touches: [{ clientX: 5, clientY: 5 }] })
    expect(state.vertecies[1]).toEqual([10, 0]) // off-target move ignored
    ctx.onTouchmove(state, { target: svgTarget(state), touches: [{ clientX: 30, clientY: 40 }] })

    state.getSnapEnabled = () => true
    map._snapInstance = { status: true, snapStatus: true, snapCoords: [7, 8], snapToClosestPoint: jest.fn() }
    ctx.onTouchmove(state, { target: svgTarget(state), touches: [{ clientX: 50, clientY: 60 }] })
    expect(state.vertecies[1]).toEqual([7, 8])

    // Snap enabled but no snap point → falls back to the pointer position
    map._snapInstance = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() }
    ctx.onTouchmove(state, { target: svgTarget(state), touches: [{ clientX: 35, clientY: 45 }] })
    expect(state._touchMoved).toBe(true)
  })

  test('onTap clears the snap indicator, then selects a vertex, inserts on a midpoint, or clears with no target', () => {
    const { ctx, state, api, map } = createHarness()
    map._snapInstance = { status: true, snapStatus: true, snapCoords: [1, 1] }
    ctx.onTap(state, { featureTarget: { properties: { meta: 'vertex', coord_path: '0.2' } } })
    expect(map.getLayer).toHaveBeenCalledWith('snap-helper-circle')
    expect(api.changeMode).toHaveBeenCalledWith('edit_vertex', expect.objectContaining({ selectedVertexType: 'vertex' }))

    api.changeMode.mockClear()
    ctx.onTap(state, { featureTarget: { properties: { meta: 'midpoint', coord_path: '0.1' } } })
    expect(api.add).toHaveBeenCalled() // insertVertex path

    api.changeMode.mockClear()
    map._snapInstance = null // no snap indicator to clear
    ctx.onTap(state, { featureTarget: undefined })
    expect(api.changeMode).toHaveBeenCalledWith('edit_vertex', expect.objectContaining({ selectedVertexIndex: -1 }))
  })
})
