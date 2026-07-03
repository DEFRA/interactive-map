import { createHarness, POLYGON } from './editVertex/__helpers__/harness.js'

/**
 * Tests for EditVertexMode's own methods: setup/teardown lifecycle, selection/scale/update
 * events, and the small move/button/changeMode routing. The keyboard, pointer, touch, undo,
 * vertex-query, vertex-operation and geometry helpers are covered in their own colocated
 * test files under editVertex/.
 */

describe('onSetup / onStop lifecycle', () => {
  test('populates state, clears the undo stack for a new feature and registers listeners', () => {
    const { ctx, state, map } = createHarness()
    expect(state.featureId).toBe('feat-1')
    // Real PolygonFeature stores rings without the duplicate closing coordinate
    expect(state.vertecies).toHaveLength(4)
    expect(state.midpoints).toHaveLength(4)
    expect(map._lastEditFeatureId).toBe('feat-1')
    expect(map._drawEditContainer).toBe(state.container)
    expect(ctx.map.on).toHaveBeenCalledWith('draw.update', expect.any(Function))
  })

  test('does not clear the undo stack when re-entering the same feature', () => {
    const { ctx, map, options } = createHarness()
    map._undoStack.push({ type: 'move_vertex' })
    // map._lastEditFeatureId is already 'feat-1' from the first setup
    ctx.onSetup(options)
    expect(map._undoStack.length).toBe(1)
  })

  test('onStop removes listeners and clears editing container; DirectSelect touch stubs are inert', () => {
    const { ctx, state, map } = createHarness()
    expect(() => { ctx.onTouchStart(); ctx.onTouchMove(); ctx.onTouchEnd() }).not.toThrow()
    ctx.onStop(state)
    expect(map._drawEditContainer).toBeNull()
    expect(map.off).toHaveBeenCalledWith('draw.update', expect.any(Function))
  })

  test('onSetup edge cases: clears an active snap indicator, positions or skips the touch target, clears an explicit -1 selection', () => {
    jest.useFakeTimers()
    const { ctx, map, options } = createHarness()
    map._snapInstance = { status: true, snapStatus: false, snapCoords: null }
    ctx.onSetup(options)
    expect(map.getLayer).toHaveBeenCalledWith('snap-helper-circle')

    const touch = createHarness(POLYGON(), { interfaceType: 'touch', selectedVertexIndex: 0, selectedVertexType: 'vertex' })
    jest.runAllTimers()
    expect(touch.state.touchVertexTarget.style.display).toBe('block')

    const outOfRange = createHarness(POLYGON(), { interfaceType: 'touch', selectedVertexIndex: 99, selectedVertexType: 'vertex' })
    jest.runAllTimers()
    expect(outOfRange.state.touchVertexTarget.style.display).toBe('none')

    const cleared = createHarness(POLYGON(), { selectedVertexIndex: -1 })
    expect(cleared.ctx.clearSelectedCoordinates).toHaveBeenCalled()
  })
})

describe('selection, scale and update events', () => {
  test('applyVertexSelection handles midpoint entry and cleared selection', () => {
    jest.useFakeTimers()
    const midpoint = createHarness(POLYGON(), { selectedVertexType: 'midpoint', selectedVertexIndex: 4 })
    jest.runAllTimers()
    expect(midpoint.ctx.clearSelectedCoordinates).toHaveBeenCalled()
    expect(midpoint.map.getSource).toHaveBeenCalledWith('mapbox-gl-draw-hot')
  })

  test('onSelectionChange searches by coordinate for mouse, trusts coordPath/keyboard otherwise', () => {
    const { ctx, state, map } = createHarness()
    const geom = ctx.getFeature('feat-1').toGeoJSON().geometry
    ctx.onSelectionChange(state, { points: [{ geometry: { coordinates: [10, 0] } }], features: [{ geometry: geom }] })
    expect(state.selectedVertexIndex).toBe(1)
    expect(map.fire).toHaveBeenCalledWith('draw.vertexselection', expect.objectContaining({ numVertecies: 4 }))

    state.coordPath = '0.2'
    state.selectedVertexIndex = 2
    ctx.onSelectionChange(state, { points: [{ geometry: { coordinates: [10, 10] } }], features: [{ geometry: geom }] })
    expect(state.selectedVertexIndex).toBe(2) // trusted, not re-searched

    // Keyboard mode trusts the selection; with no event vertex it falls back to state, then null
    const kb = createHarness()
    const g2 = kb.ctx.getFeature('feat-1').toGeoJSON().geometry
    kb.state.interfaceType = 'keyboard'
    kb.state.selectedVertexIndex = 2
    kb.ctx.onSelectionChange(kb.state, { points: [{ geometry: { coordinates: [10, 10] } }], features: [{ geometry: g2 }] })
    expect(kb.state.selectedVertexType).toBe('vertex')
    kb.ctx.onSelectionChange({ ...kb.state, interfaceType: 'mouse', selectedVertexType: 'vertex', selectedVertexIndex: 0 }, { points: [], features: [{ geometry: g2 }] })
    kb.ctx.onSelectionChange({ ...kb.state, interfaceType: 'mouse', selectedVertexType: null, selectedVertexIndex: -1 }, { points: [], features: [{ geometry: g2 }] })
  })

  test('onScaleChange and onInterfaceTypeChange update state and the touch target', () => {
    const { ctx, state } = createHarness()
    ctx.onScaleChange(state, { scale: 2 })
    expect(state.scale).toBe(2)
    state.selectedVertexIndex = 0
    ctx.onInterfaceTypeChange(state, { interfaceType: 'touch' })
    expect(state.interfaceType).toBe('touch')
    ctx.onInterfaceTypeChange({ ...state, selectedVertexIndex: -1 }, { interfaceType: 'mouse' })
  })

  test('onUpdate re-selects a changed vertex only when the vertex count is ambiguous', () => {
    const { ctx, state } = createHarness()
    ctx.onUpdate(state) // unique coords → no change
    state.vertecies = [[0, 0], [0, 0], [1, 1]]
    ctx.onUpdate(state)
    expect(state.selectedVertexIndex).toBe(-1)
  })
})

describe('move, button and changeMode routing', () => {
  test('onMove keeps the touch target aligned with the selected vertex, ignoring an unselected vertex', () => {
    const { ctx, state } = createHarness()
    state.selectedVertexIndex = 0
    state.interfaceType = 'touch'
    ctx.onMove(state)
    expect(state.touchVertexTarget.style.display).toBe('block')
    expect(() => ctx.onMove({ ...state, selectedVertexIndex: -1 })).not.toThrow()
  })

  test('onButtonClick deletes or undoes based on the clicked control', () => {
    const { ctx, state, container } = createHarness()
    const del = document.createElement('button')
    del.id = 'delete-vertex'
    const undo = document.createElement('button')
    undo.id = 'undo-vertex'
    container.append(del, undo)
    const deleteSpy = jest.spyOn(ctx, 'deleteVertex').mockImplementation(() => {})
    const undoSpy = jest.spyOn(ctx, 'handleUndo').mockImplementation(() => {})

    ctx.onButtonClick({ ...state, selectedVertexType: 'vertex' }, { target: del })
    expect(deleteSpy).toHaveBeenCalled()
    ctx.onButtonClick(state, { target: undo })
    expect(undoSpy).toHaveBeenCalled()
  })

  test('changeMode is a no-op without a feature id', () => {
    const { ctx, api } = createHarness()
    ctx.changeMode({ featureId: null }, { selectedVertexIndex: -1 })
    expect(api.changeMode).not.toHaveBeenCalled()
  })
})
