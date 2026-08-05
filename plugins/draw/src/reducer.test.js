import { initialState, actions } from './reducer.js'

describe('initialState', () => {
  test('has sensible defaults', () => {
    expect(initialState).toMatchObject({
      mode: null,
      action: null,
      actionValid: false,
      feature: null,
      tempFeature: null,
      selectedVertexIndex: -1,
      numVertices: null,
      snap: false,
      hasSnapLayers: false,
      undoStackLength: 0,
      canAddPoint: true
    })
  })
})

describe('SET_MODE', () => {
  test('resets numVertices to 0 for draw modes', () => {
    expect(actions.SET_MODE(initialState, 'draw_polygon')).toMatchObject({ mode: 'draw_polygon', numVertices: 0 })
    expect(actions.SET_MODE(initialState, 'draw_line')).toMatchObject({ mode: 'draw_line', numVertices: 0 })
  })

  test('a fresh mode can always place a point', () => {
    const state = { ...initialState, canAddPoint: false }
    expect(actions.SET_MODE(state, 'draw_polygon')).toMatchObject({ canAddPoint: true })
  })

  test('preserves numVertices for non-draw modes', () => {
    const state = { ...initialState, numVertices: 5 }
    expect(actions.SET_MODE(state, 'edit_vertex')).toMatchObject({ mode: 'edit_vertex', numVertices: 5 })
    expect(actions.SET_MODE(state, null)).toMatchObject({ mode: null, numVertices: 5 })
  })
})

describe('SET_ACTION', () => {
  test('sets the action name and validity', () => {
    expect(actions.SET_ACTION(initialState, { name: 'split', isValid: true }))
      .toMatchObject({ action: 'split', actionValid: true })
  })
})

describe('SET_FEATURE', () => {
  test('updates provided fields and preserves undefined ones', () => {
    const state = { ...initialState, feature: 'F', tempFeature: 'T' }
    expect(actions.SET_FEATURE(state, { feature: 'F2' })).toMatchObject({ feature: 'F2', tempFeature: 'T' })
    expect(actions.SET_FEATURE(state, { tempFeature: null })).toMatchObject({ feature: 'F', tempFeature: null })
    expect(actions.SET_FEATURE(state, { feature: null, tempFeature: null })).toMatchObject({ feature: null, tempFeature: null })
  })
})

describe('SET_SELECTED_VERTEX_INDEX', () => {
  test('sets the index and numVertices', () => {
    expect(actions.SET_SELECTED_VERTEX_INDEX(initialState, { index: 2, numVertices: 4 }))
      .toMatchObject({ selectedVertexIndex: 2, numVertices: 4 })
  })
})

describe('snap actions', () => {
  test('TOGGLE_SNAP flips the snap flag', () => {
    expect(actions.TOGGLE_SNAP({ ...initialState, snap: false }).snap).toBe(true)
    expect(actions.TOGGLE_SNAP({ ...initialState, snap: true }).snap).toBe(false)
  })

  test('SET_HAS_SNAP_LAYERS coerces the payload to a boolean', () => {
    expect(actions.SET_HAS_SNAP_LAYERS(initialState, ['x']).hasSnapLayers).toBe(true)
    expect(actions.SET_HAS_SNAP_LAYERS(initialState, null).hasSnapLayers).toBe(false)
  })
})

describe('SET_UNDO_STACK_LENGTH', () => {
  test('sets the undo stack length', () => {
    expect(actions.SET_UNDO_STACK_LENGTH(initialState, 3).undoStackLength).toBe(3)
  })
})

describe('SET_CAN_ADD_POINT', () => {
  test('coerces the payload to a boolean', () => {
    expect(actions.SET_CAN_ADD_POINT(initialState, false).canAddPoint).toBe(false)
    expect(actions.SET_CAN_ADD_POINT(initialState, 1).canAddPoint).toBe(true)
  })
})
