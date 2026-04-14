import { initialState, actions } from './reducer.js'

describe('initialState', () => {
  it('has correct defaults', () => {
    expect(initialState).toEqual({
      enabled: false,
      layers: [],
      marker: null,
      interactionModes: null,
      multiSelect: false,
      contiguous: false,
      deselectOnClickOutside: false,
      selectedFeatures: [],
      selectedMarkers: [],
      selectionBounds: null,
      closeOnAction: true
    })
  })
})

describe('ENABLE/DISABLE actions', () => {
  it('ENABLE sets enabled and merges payload', () => {
    const state = { ...initialState, enabled: false }
    const marker = { symbol: 'pin', backgroundColor: 'red' }
    const payload = { layers: [1], marker }
    const result = actions.ENABLE(state, payload)

    expect(result.enabled).toBe(true)
    expect(result.layers).toEqual([1])
    expect(result.marker).toEqual(marker)
    expect(result).not.toBe(state)
  })

  it('DISABLE sets enabled to false, clears selection and markers, and preserves other state', () => {
    const marker = { symbol: 'pin', backgroundColor: 'red' }
    const state = { ...initialState, enabled: true, layers: [1], marker, selectedFeatures: [{ featureId: 'f1' }], selectedMarkers: ['m1'], selectionBounds: [0, 0, 1, 1] }
    const result = actions.DISABLE(state)

    expect(result.enabled).toBe(false)
    expect(result.layers).toEqual([1])
    expect(result.marker).toEqual(marker)
    expect(result.selectedFeatures).toEqual([])
    expect(result.selectedMarkers).toEqual([])
    expect(result.selectionBounds).toBeNull()
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

  it('clears selectedMarkers in single-select; preserves them in multi-select', () => {
    const state = { ...initialState, selectedMarkers: ['m1'] }
    const feature = createFeature('f1')

    // single-select clears markers
    const single = actions.TOGGLE_SELECTED_FEATURES(state, feature)
    expect(single.selectedMarkers).toEqual([])

    // multi-select preserves markers
    const multi = actions.TOGGLE_SELECTED_FEATURES(state, { ...feature, multiSelect: true })
    expect(multi.selectedMarkers).toEqual(['m1'])
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

describe('TOGGLE_SELECTED_MARKERS action', () => {
  it('selects a marker in single-select mode and clears features', () => {
    const state = { ...initialState, selectedFeatures: [{ featureId: 'f1' }], selectionBounds: { sw: [0, 0], ne: [1, 1] } }
    const result = actions.TOGGLE_SELECTED_MARKERS(state, { markerId: 'm1', multiSelect: false })
    expect(result.selectedMarkers).toEqual(['m1'])
    expect(result.selectedFeatures).toEqual([])
    expect(result.selectionBounds).toBeNull()
  })

  it('toggles off the only selected marker in single-select mode', () => {
    const state = { ...initialState, selectedMarkers: ['m1'] }
    const result = actions.TOGGLE_SELECTED_MARKERS(state, { markerId: 'm1', multiSelect: false })
    expect(result.selectedMarkers).toEqual([])
  })

  it('adds a marker in multi-select mode without clearing features', () => {
    const state = { ...initialState, selectedFeatures: [{ featureId: 'f1' }], selectedMarkers: ['m1'] }
    const result = actions.TOGGLE_SELECTED_MARKERS(state, { markerId: 'm2', multiSelect: true })
    expect(result.selectedMarkers).toEqual(['m1', 'm2'])
    expect(result.selectedFeatures).toEqual([{ featureId: 'f1' }])
  })

  it('removes a marker in multi-select mode', () => {
    const state = { ...initialState, selectedMarkers: ['m1', 'm2'] }
    const result = actions.TOGGLE_SELECTED_MARKERS(state, { markerId: 'm1', multiSelect: true })
    expect(result.selectedMarkers).toEqual(['m2'])
  })
})

describe('CLEAR_SELECTED_FEATURES action', () => {
  it('resets features, markers and bounds', () => {
    const state = {
      ...initialState,
      selectedFeatures: [1],
      selectedMarkers: ['m1'],
      selectionBounds: { sw: [0, 0], ne: [1, 1] }
    }
    const result = actions.CLEAR_SELECTED_FEATURES(state)
    expect(result.selectedFeatures).toEqual([])
    expect(result.selectedMarkers).toEqual([])
    expect(result.selectionBounds).toBeNull()
    expect(result).not.toBe(state)
  })
})

describe('SELECT_MARKER action', () => {
  it('adds a marker in single-select mode, clearing selectedFeatures', () => {
    const state = { ...initialState, selectedFeatures: [{ featureId: 'f1' }], selectedMarkers: [] }
    const result = actions.SELECT_MARKER(state, { markerId: 'm1', multiSelect: false })
    expect(result.selectedMarkers).toEqual(['m1'])
    expect(result.selectedFeatures).toEqual([])
    expect(result.selectionBounds).toBeNull()
  })

  it('adds a marker in multi-select mode without clearing selectedFeatures', () => {
    const state = { ...initialState, selectedFeatures: [{ featureId: 'f1' }], selectedMarkers: ['m1'] }
    const result = actions.SELECT_MARKER(state, { markerId: 'm2', multiSelect: true })
    expect(result.selectedMarkers).toEqual(['m1', 'm2'])
    expect(result.selectedFeatures).toEqual([{ featureId: 'f1' }])
  })

  it('is idempotent — does not change state if marker already selected', () => {
    const state = { ...initialState, selectedMarkers: ['m1'] }
    const result = actions.SELECT_MARKER(state, { markerId: 'm1', multiSelect: false })
    expect(result).toBe(state)
  })
})

describe('UNSELECT_MARKER action', () => {
  it('removes a selected marker', () => {
    const state = { ...initialState, selectedMarkers: ['m1', 'm2'] }
    const result = actions.UNSELECT_MARKER(state, { markerId: 'm1' })
    expect(result.selectedMarkers).toEqual(['m2'])
  })

  it('is idempotent — does not change state if marker not selected', () => {
    const state = { ...initialState, selectedMarkers: ['m2'] }
    const result = actions.UNSELECT_MARKER(state, { markerId: 'm1' })
    expect(result).toBe(state)
  })
})

describe('actions object', () => {
  it('exports all action handlers as functions', () => {
    expect(Object.keys(actions)).toEqual([
      'ENABLE',
      'DISABLE',
      'TOGGLE_SELECTED_FEATURES',
      'TOGGLE_SELECTED_MARKERS',
      'UPDATE_SELECTED_BOUNDS',
      'CLEAR_SELECTED_FEATURES',
      'SELECT_MARKER',
      'UNSELECT_MARKER'
    ])
    Object.values(actions).forEach(fn => expect(typeof fn).toBe('function'))
  })
})
