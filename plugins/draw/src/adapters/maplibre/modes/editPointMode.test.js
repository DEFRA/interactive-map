import { createHarness } from './editPointMode/__helpers__/harness.js'
import { isActiveFeature } from '../../../../../../node_modules/@mapbox/mapbox-gl-draw/src/lib/common_selectors.js' // NOSONAR

/**
 * Tests for EditPointMode's own methods: setup/teardown lifecycle, scale/move/interface-type
 * events, and toDisplayFeatures/button routing. The keyboard, pointer, touch, undo and
 * point-operation handlers are covered in their own colocated test files under editPointMode/.
 */

describe('onSetup / onStop lifecycle', () => {
  test('builds state without throwing on a Point (DirectSelect.onSetup itself throws a TypeError here)', () => {
    const { state, map } = createHarness()
    expect(state.featureId).toBe('feat-1')
    expect(state.selectedCoordPaths).toEqual([])
    expect(state.feature.coordinates).toEqual([5, 5])
    expect(map._lastEditFeatureId).toBe('feat-1')
    expect(map._drawEditContainer).toBe(state.container)
  })

  // Regression: a keyboard-only session has no click/tap to move focus onto the map first
  // (the point is already selected from the moment this mode starts) — without claiming
  // focus explicitly, keyboardHandlers.js's isInteractiveElementFocused guard would block
  // every arrow key until an unrelated click happened to land on the viewport.
  test('claims focus on the container so a keyboard-only session works without a prior click', () => {
    const { state } = createHarness()
    expect(document.activeElement).toBe(state.container)
  })

  test('throws when no feature is found for the given featureId', () => {
    const { ctx, options } = createHarness()
    expect(() => ctx.onSetup({ ...options, featureId: 'missing' })).toThrow()
  })

  test('claims the D-pad exactly once at setup, never followed by draw.vertexchange', () => {
    const { map } = createHarness()
    // numVertecies (misspelled) — MaplibreDrawAdapter.js's vertexselection handler only reads
    // that exact key when normalising to the adapter contract's numVertices.
    expect(map.fire).toHaveBeenCalledWith('draw.vertexselection', { index: 0, numVertecies: 1 })
    expect(map.fire).not.toHaveBeenCalledWith('draw.vertexchange', expect.anything())
  })

  // Shared listener wiring (scalechange, nudge, pointer/touch/keyboard) is covered by
  // editModeEvents.test.js — this only asserts what's specific to edit_point: no ring-only
  // vertex/update events.
  test("does not register the ring-only vertex/update events — those are edit_vertex's alone", () => {
    const { map } = createHarness()
    expect(map.on).not.toHaveBeenCalledWith('draw.selectionchange', expect.any(Function))
    expect(map.on).not.toHaveBeenCalledWith('draw.update', expect.any(Function))
  })

  test('does not clear the undo stack when re-entering the same feature', () => {
    const { ctx, map, options } = createHarness()
    map._undoStack.push({ type: 'move_point' })
    // map._lastEditFeatureId is already 'feat-1' from the first setup
    ctx.onSetup(options)
    expect(map._undoStack).toHaveLength(1)
  })

  // Listener teardown itself is covered by editModeEvents.test.js.
  test('onStop clears the editing container; DirectSelect touch stubs are inert', () => {
    const { ctx, state, map } = createHarness()
    expect(() => { ctx.onTouchStart(); ctx.onTouchMove(); ctx.onTouchEnd() }).not.toThrow()
    ctx.onStop(state)
    expect(map._drawEditContainer).toBeNull()
  })

  test('clears an active snap indicator and positions the touch target when entering on touch', () => {
    jest.useFakeTimers()
    const { ctx, map, options } = createHarness()
    map._snapInstance = { status: true, snapStatus: false, snapCoords: null }
    map.getLayer.mockClear()

    const state = ctx.onSetup({ ...options, interfaceType: 'touch' })
    expect(map.getLayer).toHaveBeenCalledWith('snap-helper-circle')
    jest.runAllTimers()
    expect(state.touchPointTarget.style.display).toBe('block')
    jest.useRealTimers()
  })
})

describe('toDisplayFeatures', () => {
  test('flags the edited feature active (isActiveFeature() depends on it — see the mode\'s own comment) and pushes every feature, without supplementary points', () => {
    const { ctx, state } = createHarness()
    const pushed = []
    const push = (f) => pushed.push(f)

    ctx.toDisplayFeatures(state, { properties: { id: 'feat-1' } }, push)
    ctx.toDisplayFeatures(state, { properties: { id: 'other' } }, push)

    expect(pushed).toEqual([
      { properties: { id: 'feat-1', active: 'true' } },
      { properties: { id: 'other', active: 'false' } }
    ])
  })

  // Regression: mapbox-gl-draw's own isActiveFeature() selector (which DirectSelect.onMouseDown
  // uses to route a mousedown into onFeature/startDragging, and which this mode's own onClick
  // uses to tell "click the point" apart from "click elsewhere") requires active === 'true' on
  // the rendered feature — asserting against the real selector, not a hand-built fixture,
  // catches a regression here that unit tests using a hand-built featureTarget would miss.
  test('the pushed feature is recognised by the real isActiveFeature() selector', () => {
    const { ctx, state } = createHarness()
    const pushed = []
    // meta: 'feature' mirrors what mapbox-gl-draw's own Feature.prototype.internal() sets on
    // every stored feature's rendered GeoJSON — toDisplayFeatures only ever adds `active`.
    ctx.toDisplayFeatures(state, { properties: { id: state.featureId, meta: 'feature' } }, (f) => pushed.push(f))
    expect(isActiveFeature({ featureTarget: pushed[0] })).toBe(true)
  })
})

describe('scale, move and interface-type events', () => {
  test('onScaleChange and onInterfaceTypeChange update state and reposition the touch target', () => {
    const { ctx, state } = createHarness()
    ctx.onScaleChange(state, { scale: 2 })
    expect(state.scale).toBe(2)
    ctx.onInterfaceTypeChange(state, { interfaceType: 'touch' })
    expect(state.interfaceType).toBe('touch')
  })

  test('onMove keeps the touch target aligned with the point', () => {
    const { ctx, state } = createHarness()
    state.interfaceType = 'touch'
    ctx.onMove(state)
    expect(state.touchPointTarget.style.display).toBe('block')
  })

  test('draw.nudgevertex moves the point and repositions the touch target — the inbound bridge for MoveControls.mapProvider.activeMoveTarget', () => {
    jest.useFakeTimers()
    const { state, map } = createHarness(undefined, { interfaceType: 'touch' })
    jest.runAllTimers() // flush onSetup's deferred initial touch-target positioning
    const before = [...state.feature.coordinates]
    const targetBefore = { top: state.touchPointTarget.style.top, left: state.touchPointTarget.style.left }
    map.fire('draw.nudgevertex', { dx: 1, dy: 0, isLargeStep: true })
    expect(state.feature.coordinates).not.toEqual(before)
    expect({ top: state.touchPointTarget.style.top, left: state.touchPointTarget.style.left }).not.toEqual(targetBefore)
    jest.useRealTimers()
  })
})

describe('button routing', () => {
  test('onButtonClick only wires the undo control — there is no delete-vertex button in this mode', () => {
    const { ctx, state, container } = createHarness()
    const undo = document.createElement('button')
    undo.id = 'undo-vertex'
    container.append(undo)
    const undoSpy = jest.spyOn(ctx, 'handleUndo').mockImplementation(() => {})

    ctx.onButtonClick(state, { target: undo })
    expect(undoSpy).toHaveBeenCalled()

    const other = document.createElement('button')
    container.append(other)
    ctx.onButtonClick(state, { target: other })
    expect(undoSpy).toHaveBeenCalledTimes(1)
  })
})
