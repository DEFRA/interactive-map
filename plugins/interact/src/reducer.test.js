import { initialState, actions } from './reducer.js'

describe('initialState', () => {
  it('has correct defaults', () => {
    expect(initialState).toEqual({
      enabled: false,
      dataLayers: [],
      markerColor: null,
      interactionMode: null,
      multiSelect: false,
      contiguous: false,
      selectedFeatures: [],
      selectionBounds: null,
      closeOnAction: true
    })
  })
})

describe('ENABLE/DISABLE actions', () => {
  it('ENABLE sets enabled and merges payload', () => {
    const state = { ...initialState, enabled: false }
    const payload = { dataLayers: [1], markerColor: 'red' }
    const result = actions.ENABLE(state, payload)

    expect(result.enabled).toBe(true)
    expect(result.dataLayers).toEqual([1])
    expect(result.markerColor).toBe('red')
    expect(result).not.toBe(state)
  })

  it('DISABLE sets enabled to false but preserves other state', () => {
    const state = { ...initialState, enabled: true, dataLayers: [1], markerColor: 'red' }
    const result = actions.DISABLE(state)

    expect(result.enabled).toBe(false)
    expect(result.dataLayers).toEqual([1])
    expect(result.markerColor).toBe('red')
    expect(result).not.toBe(state)
  })
})


describe('TOGGLE_SELECTED_FEATURES action', () => {
  const createFeature = (id, layerId = 'layer1') => ({
    featureId: id,
    layerId,
    idProperty: 'id',
    properties: { name: `Feature ${id}` },
    geometry: { type: 'Point', coordinates: [0, 0] }
  })

  it('handles single-select, multi-select, add/remove, and replaceAll', () => {
    let state = { ...initialState, selectionBounds: { sw: [0, 0], ne: [1, 1] } }

    // Single-select: add
    state = actions.TOGGLE_SELECTED_FEATURES(state, createFeature('f1'))
    expect(state.selectedFeatures).toHaveLength(1)

    // Single-select: replace
    state = actions.TOGGLE_SELECTED_FEATURES(state, createFeature('f2'))
    expect(state.selectedFeatures[0].featureId).toBe('f2')

    // Toggle off same - clears bounds
    state = actions.TOGGLE_SELECTED_FEATURES(state, createFeature('f2'))
    expect(state.selectedFeatures).toHaveLength(0)
    expect(state.selectionBounds).toBeNull()

    // Multi-select: add multiple
    state = { ...state, selectionBounds: { sw: [0, 0], ne: [1, 1] } }
    state = actions.TOGGLE_SELECTED_FEATURES(state, { ...createFeature('f1'), multiSelect: true })
    state = actions.TOGGLE_SELECTED_FEATURES(state, { ...createFeature('f2'), multiSelect: true })
    expect(state.selectedFeatures.map(f => f.featureId)).toEqual(['f1', 'f2'])

    // Multi-select: remove (not last) - clears bounds for recalculation
    state = actions.TOGGLE_SELECTED_FEATURES(state, { ...createFeature('f1'), multiSelect: true })
    expect(state.selectedFeatures.map(f => f.featureId)).toEqual(['f2'])
    expect(state.selectionBounds).toBeNull()

    // Multi-select: remove last - clears bounds
    state = actions.TOGGLE_SELECTED_FEATURES(state, { ...createFeature('f2'), multiSelect: true })
    expect(state.selectedFeatures).toHaveLength(0)
    expect(state.selectionBounds).toBeNull()

    // addToExisting false removes feature - clears bounds when empty
    state = { ...state, selectionBounds: { sw: [0, 0], ne: [1, 1] } }
    state = actions.TOGGLE_SELECTED_FEATURES(state, { ...createFeature('f2'), multiSelect: true })
    state = actions.TOGGLE_SELECTED_FEATURES(state, { ...createFeature('f2'), addToExisting: false })
    expect(state.selectedFeatures).toHaveLength(0)
    expect(state.selectionBounds).toBeNull()

    // replaceAll replaces everything
    state = actions.TOGGLE_SELECTED_FEATURES(state, { ...createFeature('f3'), replaceAll: true })
    expect(state.selectedFeatures).toHaveLength(1)
    expect(state.selectedFeatures[0].featureId).toBe('f3')
  })

  it('handles null or empty selectedFeatures gracefully', () => {
    let state = { ...initialState, selectedFeatures: null }
    state = actions.TOGGLE_SELECTED_FEATURES(state, createFeature('f1'))
    expect(state.selectedFeatures).toHaveLength(1)

    state = { ...initialState, selectedFeatures: [] }
    state = actions.TOGGLE_SELECTED_FEATURES(state, { ...createFeature('f2'), addToExisting: false })
    expect(state.selectedFeatures).toEqual([])
  })

  it('matches by both featureId and layerId', () => {
    const state = { ...initialState, selectedFeatures: [createFeature('f1', 'layer1')] }
    const payload = createFeature('f1', 'layer2')
    const result = actions.TOGGLE_SELECTED_FEATURES(state, payload)
    expect(result.selectedFeatures[0].layerId).toBe('layer2')
  })
})

describe('UPDATE_SELECTED_BOUNDS action', () => {
  it('updates selectionBounds correctly', () => {
    const state = { ...initialState, selectionBounds: { sw: [0, 0], ne: [1, 1] } }
    const newBounds = { sw: [0, 0], ne: [2, 2] }
    const result = actions.UPDATE_SELECTED_BOUNDS(state, newBounds)
    expect(result.selectionBounds).toEqual(newBounds)

    // unchanged bounds returns same state
    const result2 = actions.UPDATE_SELECTED_BOUNDS(state, { sw: [0, 0], ne: [1, 1] })
    expect(result2).toBe(state)
  })
})

describe('CLEAR_SELECTED_FEATURES action', () => {
  it('resets selection and bounds', () => {
    const state = {
      ...initialState,
      selectedFeatures: [1],
      selectionBounds: { sw: [0, 0], ne: [1, 1] }
    }
    const result = actions.CLEAR_SELECTED_FEATURES(state)
    expect(result.selectedFeatures).toEqual([])
    expect(result.selectionBounds).toBeNull()
    expect(result).not.toBe(state)
  })
})

describe('actions object', () => {
  it('exports all action handlers as functions', () => {
    expect(Object.keys(actions)).toEqual([
      'ENABLE',
      'DISABLE',
      'TOGGLE_SELECTED_FEATURES',
      'UPDATE_SELECTED_BOUNDS',
      'CLEAR_SELECTED_FEATURES'
    ])
    Object.values(actions).forEach(fn => expect(typeof fn).toBe('function'))
  })
})
