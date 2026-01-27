import { initialState, actions } from './reducer.js'

describe('initialState', () => {
  it('has correct default values', () => {
    expect(initialState).toEqual({
      enabled: false,
      dataLayers: [],
      markerColor: null,
      interactionMode: null,
      multiSelect: false,
      selectedFeatures: [],
      selectionBounds: null,
      closeOnAction: true
    })
  })

  it('enabled defaults to false', () => {
    expect(initialState.enabled).toBe(false)
  })

  it('selectedFeatures defaults to empty array', () => {
    expect(initialState.selectedFeatures).toEqual([])
  })

  it('selectionBounds defaults to null', () => {
    expect(initialState.selectionBounds).toBeNull()
  })
})

describe('ENABLE action', () => {
  it('sets enabled to true', () => {
    const state = { ...initialState }
    const result = actions.ENABLE(state, {})

    expect(result.enabled).toBe(true)
  })

  it('merges payload with existing state', () => {
    const state = { ...initialState }
    const payload = {
      dataLayers: [{ layerId: 'test' }],
      markerColor: 'red',
      interactionMode: 'select'
    }

    const result = actions.ENABLE(state, payload)

    expect(result.dataLayers).toEqual([{ layerId: 'test' }])
    expect(result.markerColor).toBe('red')
    expect(result.interactionMode).toBe('select')
    expect(result.enabled).toBe(true)
  })

  it('returns new state object (immutability)', () => {
    const state = { ...initialState }
    const result = actions.ENABLE(state, {})

    expect(result).not.toBe(state)
  })
})

describe('DISABLE action', () => {
  it('sets enabled to false', () => {
    const state = { ...initialState, enabled: true }
    const result = actions.DISABLE(state)

    expect(result.enabled).toBe(false)
  })

  it('preserves other state properties', () => {
    const state = {
      ...initialState,
      enabled: true,
      dataLayers: [{ layerId: 'test' }],
      markerColor: 'blue'
    }
    const result = actions.DISABLE(state)

    expect(result.dataLayers).toEqual([{ layerId: 'test' }])
    expect(result.markerColor).toBe('blue')
  })

  it('returns new state object (immutability)', () => {
    const state = { ...initialState, enabled: true }
    const result = actions.DISABLE(state)

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

  describe('single-select mode', () => {
    it('selects a feature when none selected', () => {
      const state = { ...initialState, selectedFeatures: [] }
      const payload = createFeature('f1')

      const result = actions.TOGGLE_SELECTED_FEATURES(state, payload)

      expect(result.selectedFeatures).toHaveLength(1)
      expect(result.selectedFeatures[0].featureId).toBe('f1')
    })

    it('replaces selection when different feature clicked', () => {
      const state = {
        ...initialState,
        selectedFeatures: [createFeature('f1')]
      }
      const payload = createFeature('f2')

      const result = actions.TOGGLE_SELECTED_FEATURES(state, payload)

      expect(result.selectedFeatures).toHaveLength(1)
      expect(result.selectedFeatures[0].featureId).toBe('f2')
    })

    it('clears selection when same feature clicked (toggle off)', () => {
      const state = {
        ...initialState,
        selectedFeatures: [createFeature('f1')]
      }
      const payload = createFeature('f1')

      const result = actions.TOGGLE_SELECTED_FEATURES(state, payload)

      expect(result.selectedFeatures).toHaveLength(0)
    })

    it('stores featureId, layerId, idProperty, properties, geometry', () => {
      const state = { ...initialState, selectedFeatures: [] }
      const payload = {
        featureId: 'f1',
        layerId: 'layer1',
        idProperty: 'objectId',
        properties: { name: 'Test' },
        geometry: { type: 'Polygon', coordinates: [[]] }
      }

      const result = actions.TOGGLE_SELECTED_FEATURES(state, payload)

      expect(result.selectedFeatures[0]).toEqual({
        featureId: 'f1',
        layerId: 'layer1',
        idProperty: 'objectId',
        properties: { name: 'Test' },
        geometry: { type: 'Polygon', coordinates: [[]] }
      })
    })
  })

  describe('multi-select mode', () => {
    it('adds feature to existing selection', () => {
      const state = {
        ...initialState,
        selectedFeatures: [createFeature('f1')]
      }
      const payload = { ...createFeature('f2'), multiSelect: true }

      const result = actions.TOGGLE_SELECTED_FEATURES(state, payload)

      expect(result.selectedFeatures).toHaveLength(2)
      expect(result.selectedFeatures[0].featureId).toBe('f1')
      expect(result.selectedFeatures[1].featureId).toBe('f2')
    })

    it('removes feature when clicking selected feature (toggle)', () => {
      const state = {
        ...initialState,
        selectedFeatures: [createFeature('f1'), createFeature('f2')]
      }
      const payload = { ...createFeature('f1'), multiSelect: true }

      const result = actions.TOGGLE_SELECTED_FEATURES(state, payload)

      expect(result.selectedFeatures).toHaveLength(1)
      expect(result.selectedFeatures[0].featureId).toBe('f2')
    })
  })

  describe('explicit unselect (addToExisting: false)', () => {
    it('removes specified feature from selection', () => {
      const state = {
        ...initialState,
        selectedFeatures: [createFeature('f1'), createFeature('f2')]
      }
      const payload = { ...createFeature('f1'), addToExisting: false }

      const result = actions.TOGGLE_SELECTED_FEATURES(state, payload)

      expect(result.selectedFeatures).toHaveLength(1)
      expect(result.selectedFeatures[0].featureId).toBe('f2')
    })

    it('does nothing if feature not in selection', () => {
      const state = {
        ...initialState,
        selectedFeatures: [createFeature('f1')]
      }
      const payload = { ...createFeature('f2'), addToExisting: false }

      const result = actions.TOGGLE_SELECTED_FEATURES(state, payload)

      expect(result.selectedFeatures).toHaveLength(1)
      expect(result.selectedFeatures[0].featureId).toBe('f1')
    })
  })

  describe('immutability', () => {
    it('does not mutate original state', () => {
      const originalFeatures = [createFeature('f1')]
      const state = {
        ...initialState,
        selectedFeatures: originalFeatures
      }
      const payload = createFeature('f2')

      actions.TOGGLE_SELECTED_FEATURES(state, payload)

      expect(state.selectedFeatures).toBe(originalFeatures)
      expect(state.selectedFeatures).toHaveLength(1)
    })

    it('does not mutate original selectedFeatures array', () => {
      const originalFeatures = [createFeature('f1')]
      const state = {
        ...initialState,
        selectedFeatures: originalFeatures
      }
      const payload = { ...createFeature('f2'), multiSelect: true }

      const result = actions.TOGGLE_SELECTED_FEATURES(state, payload)

      expect(result.selectedFeatures).not.toBe(originalFeatures)
    })

    it('returns new state reference', () => {
      const state = { ...initialState, selectedFeatures: [] }
      const payload = createFeature('f1')

      const result = actions.TOGGLE_SELECTED_FEATURES(state, payload)

      expect(result).not.toBe(state)
    })
  })

  describe('edge cases', () => {
    it('handles empty selectedFeatures array', () => {
      const state = { ...initialState, selectedFeatures: [] }
      const payload = { ...createFeature('f1'), addToExisting: false }

      const result = actions.TOGGLE_SELECTED_FEATURES(state, payload)

      expect(result.selectedFeatures).toEqual([])
    })

    it('handles null selectedFeatures gracefully', () => {
      const state = { ...initialState, selectedFeatures: null }
      const payload = createFeature('f1')

      const result = actions.TOGGLE_SELECTED_FEATURES(state, payload)

      expect(result.selectedFeatures).toHaveLength(1)
    })

    it('matches by both featureId and layerId', () => {
      const state = {
        ...initialState,
        selectedFeatures: [createFeature('f1', 'layer1')]
      }
      // Same featureId but different layerId - should NOT match
      const payload = createFeature('f1', 'layer2')

      const result = actions.TOGGLE_SELECTED_FEATURES(state, payload)

      // In single-select, replaces with new feature
      expect(result.selectedFeatures).toHaveLength(1)
      expect(result.selectedFeatures[0].layerId).toBe('layer2')
    })
  })
})

describe('UPDATE_SELECTED_BOUNDS action', () => {
  it('updates selectionBounds with payload', () => {
    const state = { ...initialState, selectionBounds: null }
    const newBounds = { sw: [0, 0], ne: [1, 1] }

    const result = actions.UPDATE_SELECTED_BOUNDS(state, newBounds)

    expect(result.selectionBounds).toEqual(newBounds)
  })

  it('returns same state if bounds unchanged (JSON comparison)', () => {
    const bounds = { sw: [0, 0], ne: [1, 1] }
    const state = { ...initialState, selectionBounds: bounds }

    const result = actions.UPDATE_SELECTED_BOUNDS(state, { sw: [0, 0], ne: [1, 1] })

    expect(result).toBe(state)
  })

  it('returns new state object when bounds change', () => {
    const state = { ...initialState, selectionBounds: { sw: [0, 0], ne: [1, 1] } }
    const newBounds = { sw: [0, 0], ne: [2, 2] }

    const result = actions.UPDATE_SELECTED_BOUNDS(state, newBounds)

    expect(result).not.toBe(state)
    expect(result.selectionBounds).toEqual(newBounds)
  })
})

describe('CLEAR_SELECTED_FEATURES action', () => {
  it('resets selectedFeatures to empty array', () => {
    const state = {
      ...initialState,
      selectedFeatures: [{ featureId: 'f1', layerId: 'l1' }]
    }

    const result = actions.CLEAR_SELECTED_FEATURES(state)

    expect(result.selectedFeatures).toEqual([])
  })

  it('resets selectionBounds to null', () => {
    const state = {
      ...initialState,
      selectionBounds: { sw: [0, 0], ne: [1, 1] }
    }

    const result = actions.CLEAR_SELECTED_FEATURES(state)

    expect(result.selectionBounds).toBeNull()
  })

  it('returns new state object (immutability)', () => {
    const state = { ...initialState }

    const result = actions.CLEAR_SELECTED_FEATURES(state)

    expect(result).not.toBe(state)
  })
})

describe('actions object', () => {
  it('exports all 5 action handlers', () => {
    expect(Object.keys(actions)).toHaveLength(5)
    expect(actions).toHaveProperty('ENABLE')
    expect(actions).toHaveProperty('DISABLE')
    expect(actions).toHaveProperty('TOGGLE_SELECTED_FEATURES')
    expect(actions).toHaveProperty('UPDATE_SELECTED_BOUNDS')
    expect(actions).toHaveProperty('CLEAR_SELECTED_FEATURES')
  })

  it('each handler is a function', () => {
    Object.values(actions).forEach(handler => {
      expect(typeof handler).toBe('function')
    })
  })
})
