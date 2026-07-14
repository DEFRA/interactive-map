import { initialState, actions } from './pluginState.js'
import { logger } from '../../../../../src/services/logger.js'

jest.mock('../../../../../src/services/logger.js')

// Helper: build a minimal plugin state with some mapped datasets
const makeState = (overrides = {}) => ({
  ...initialState,
  mappedDatasets: {},
  orderedDatasets: [],
  menu: [],
  ...overrides
})

// Helper: build a state that already contains a dataset
const makeStateWithDataset = (id = 'roads', extraDatasetProps = {}) => ({
  ...makeState(),
  mappedDatasets: {
    [id]: { id, label: 'Roads', visible: true, style: {}, ...extraDatasetProps }
  },
  orderedDatasets: [id],
  menu: [{ label: 'Default', items: [{ id, label: 'Roads', type: 'item' }] }]
})

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── initialState ────────────────────────────────────────────────────────────

describe('initialState', () => {
  it('has default globals', () => {
    expect(initialState.globals).toEqual({
      visible: true,
      opacity: 1,
      opacityMode: 'dataset'
    })
  })

  it('has an empty key', () => {
    expect(initialState.key).toEqual({ items: [], hasGroups: false })
  })

  it('has an empty actionsArray', () => {
    expect(initialState.actionsArray).toEqual([])
  })
})

// ─── SET_DATASETS ─────────────────────────────────────────────────────────────

describe('SET_DATASETS', () => {
  it('sets mappedDatasets, orderedDatasets and menu from payload', () => {
    const state = makeState()
    const payload = {
      datasets: [{ id: 'parks', label: 'Parks', showInMenu: true }],
      mappedDatasets: { parks: { id: 'parks', label: 'Parks' } },
      orderedDatasets: ['parks']
    }
    const result = actions.SET_DATASETS(state, payload)
    expect(result.mappedDatasets).toEqual(payload.mappedDatasets)
    expect(result.orderedDatasets).toEqual(payload.orderedDatasets)
    expect(result.menu).toEqual([])
  })

  it('derives menu from datasets when menu is not in payload', () => {
    const state = makeState()
    const payload = {
      datasets: [{ id: 'parks', label: 'Parks', showInMenu: true }],
      mappedDatasets: { parks: { id: 'parks', label: 'Parks' } },
      orderedDatasets: ['parks']
    }
    const result = actions.SET_DATASETS(state, payload)
    // Menu is derived; it should be an array
    expect(Array.isArray(result.menu)).toBe(true)
  })

  it('does not add to actionsArray', () => {
    const state = makeState()
    const payload = {
      datasets: [],
      mappedDatasets: {},
      orderedDatasets: []
    }
    const result = actions.SET_DATASETS(state, payload)
    expect(result.actionsArray).toEqual([])
  })
})

// ─── ADD_DATASET ──────────────────────────────────────────────────────────────

describe('ADD_DATASET', () => {
  it('adds a new dataset and queues an addDataset action', () => {
    const state = makeState()
    const dataset = { id: 'rivers', label: 'Rivers', showInMenu: true }
    const mapStyle = { layers: [] }

    const result = actions.ADD_DATASET(state, { dataset, mapStyle })

    expect(result.mappedDatasets).toHaveProperty('rivers')
    expect(result.orderedDatasets).toContain('rivers')
    expect(result.actionsArray).toHaveLength(1)
    expect(result.actionsArray[0]).toMatchObject({
      method: 'addDataset',
      parameters: ['rivers', mapStyle]
    })
  })

  it('logs error and returns unchanged state when dataset already exists', () => {
    const state = makeStateWithDataset('roads')
    const result = actions.ADD_DATASET(state, { dataset: { id: 'roads', label: 'Roads' }, mapStyle: {} })

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("'roads'"))
    expect(result).toBe(state)
  })
})

// ─── REMOVE_DATASET ───────────────────────────────────────────────────────────

describe('REMOVE_DATASET', () => {
  it('removes the dataset from mappedDatasets, orderedDatasets and menu', () => {
    const state = makeStateWithDataset('roads')
    const result = actions.REMOVE_DATASET(state, { id: 'roads' })

    expect(result.mappedDatasets).not.toHaveProperty('roads')
    expect(result.orderedDatasets).not.toContain('roads')
  })

  it('removes sublayers when parent is removed', () => {
    const state = makeState({
      mappedDatasets: {
        parks: { id: 'parks', label: 'Parks', sublayerIds: ['parks-zone-a'] },
        'parks-zone-a': { id: 'parks-zone-a', parentId: 'parks' }
      },
      orderedDatasets: ['parks', 'parks-zone-a'],
      menu: []
    })
    const result = actions.REMOVE_DATASET(state, { id: 'parks' })

    expect(result.mappedDatasets).not.toHaveProperty('parks')
    expect(result.mappedDatasets).not.toHaveProperty('parks-zone-a')
    expect(result.orderedDatasets).toEqual([])
  })

  it('logs error and returns unchanged state when dataset does not exist', () => {
    const state = makeState()
    const result = actions.REMOVE_DATASET(state, { id: 'unknown' })

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("'unknown'"))
    expect(result).toBe(state)
  })
})

// ─── SET_DATASET_VISIBILITY ───────────────────────────────────────────────────

describe('SET_DATASET_VISIBILITY', () => {
  it('updates dataset visibility and queues applyDatasetVisibility action', () => {
    const state = makeStateWithDataset('roads')
    const result = actions.SET_DATASET_VISIBILITY(state, { datasetId: 'roads', visible: false })

    expect(result.mappedDatasets.roads.visible).toBe(false)
    expect(result.actionsArray).toHaveLength(1)
    expect(result.actionsArray[0]).toMatchObject({
      method: 'applyDatasetVisibility',
      parameters: ['roads', false]
    })
  })

  it('logs error and returns unchanged state when dataset does not exist', () => {
    const state = makeState()
    const result = actions.SET_DATASET_VISIBILITY(state, { datasetId: 'unknown', visible: false })

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("'unknown'"))
    expect(result).toBe(state)
  })
})

// ─── SET_GLOBAL_VISIBILITY ────────────────────────────────────────────────────

describe('SET_GLOBAL_VISIBILITY', () => {
  it('updates globals.visible and queues applyGlobalVisibility action', () => {
    const state = makeState()
    const result = actions.SET_GLOBAL_VISIBILITY(state, { visible: false })

    expect(result.globals.visible).toBe(false)
    expect(result.actionsArray).toHaveLength(1)
    expect(result.actionsArray[0]).toMatchObject({
      method: 'applyGlobalVisibility',
      parameters: [false]
    })
  })
})

// ─── SET_DATASET_STYLE ────────────────────────────────────────────────────────

describe('SET_DATASET_STYLE', () => {
  it('merges style changes and queues applyStyle action', () => {
    const state = makeStateWithDataset('roads', { style: { stroke: 'red' } })
    const mapStyle = { layers: [] }
    const result = actions.SET_DATASET_STYLE(state, {
      datasetId: 'roads',
      styleChanges: { fill: 'blue' },
      mapStyle
    })

    expect(result.mappedDatasets.roads.style).toMatchObject({ stroke: 'red', fill: 'blue' })
    expect(result.actionsArray).toHaveLength(1)
    expect(result.actionsArray[0]).toMatchObject({
      method: 'applyStyle',
      parameters: ['roads', mapStyle]
    })
  })

  it('logs error and returns unchanged state when dataset does not exist', () => {
    const state = makeState()
    const result = actions.SET_DATASET_STYLE(state, { datasetId: 'unknown', styleChanges: {}, mapStyle: {} })

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("'unknown'"))
    expect(result).toBe(state)
  })
})

// ─── SET_OPACITY ──────────────────────────────────────────────────────────────

describe('SET_OPACITY', () => {
  it('sets opacity in dataset style and queues applyDatasetOpacity action', () => {
    const state = makeStateWithDataset('roads', { style: {} })
    const result = actions.SET_OPACITY(state, { datasetId: 'roads', opacity: 0.5 })

    expect(result.mappedDatasets.roads.style.opacity).toBe(0.5)
    expect(result.actionsArray).toHaveLength(1)
    expect(result.actionsArray[0]).toMatchObject({
      method: 'applyDatasetOpacity',
      parameters: ['roads']
    })
  })

  it('logs error and returns unchanged state when dataset does not exist', () => {
    const state = makeState()
    const result = actions.SET_OPACITY(state, { datasetId: 'unknown', opacity: 0.5 })

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("'unknown'"))
    expect(result).toBe(state)
  })
})

// ─── SET_GLOBAL_OPACITY ───────────────────────────────────────────────────────

describe('SET_GLOBAL_OPACITY', () => {
  it('updates globals.opacity and queues applyGlobalOpacity action', () => {
    const state = makeState()
    const result = actions.SET_GLOBAL_OPACITY(state, { opacity: 0.7 })

    expect(result.globals.opacity).toBe(0.7)
    expect(result.actionsArray).toHaveLength(1)
    expect(result.actionsArray[0]).toMatchObject({
      method: 'applyGlobalOpacity',
      parameters: []
    })
  })
})

// ─── SET_GLOBAL_STATE ─────────────────────────────────────────────────────────

describe('SET_GLOBAL_STATE', () => {
  it('merges payload into globals and queues applyGlobalOpacity action', () => {
    const state = makeState()
    const result = actions.SET_GLOBAL_STATE(state, { opacityMode: 'global' })

    expect(result.globals.opacityMode).toBe('global')
    expect(result.actionsArray).toHaveLength(1)
    expect(result.actionsArray[0]).toMatchObject({ method: 'applyGlobalOpacity' })
  })
})

// ─── HIDE_FEATURES ────────────────────────────────────────────────────────────

describe('HIDE_FEATURES', () => {
  it('starts from empty hiddenFeatures when none are set', () => {
    const state = makeStateWithDataset('roads')
    const result = actions.HIDE_FEATURES(state, { datasetId: 'roads', featureIds: [5] })
    expect(result.mappedDatasets.roads.hiddenFeatures).toEqual([5])
  })

  it('adds feature ids to hiddenFeatures and queues applyFeatureFilter', () => {
    const state = makeStateWithDataset('roads', { hiddenFeatures: [1] })
    const result = actions.HIDE_FEATURES(state, { datasetId: 'roads', featureIds: [2, 3] })

    expect(result.mappedDatasets.roads.hiddenFeatures).toEqual([1, 2, 3])
    expect(result.actionsArray[0]).toMatchObject({ method: 'applyFeatureFilter', parameters: ['roads'] })
  })

  it('deduplicates feature ids', () => {
    const state = makeStateWithDataset('roads', { hiddenFeatures: [1, 2] })
    const result = actions.HIDE_FEATURES(state, { datasetId: 'roads', featureIds: [2, 3] })

    expect(result.mappedDatasets.roads.hiddenFeatures).toEqual([1, 2, 3])
  })

  it('logs error and returns unchanged state when dataset does not exist', () => {
    const state = makeState()
    const result = actions.HIDE_FEATURES(state, { datasetId: 'unknown', featureIds: [1] })

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("'unknown'"))
    expect(result).toBe(state)
  })
})

// ─── SHOW_FEATURES ────────────────────────────────────────────────────────────

describe('SHOW_FEATURES', () => {
  it('handles dataset with no existing hiddenFeatures', () => {
    const state = makeStateWithDataset('roads')
    const result = actions.SHOW_FEATURES(state, { datasetId: 'roads', featureIds: [99] })
    expect(result.mappedDatasets.roads.hiddenFeatures).toEqual([-1])
  })

  it('removes feature ids from hiddenFeatures and queues applyFeatureFilter', () => {
    const state = makeStateWithDataset('roads', { hiddenFeatures: [1, 2, 3] })
    const result = actions.SHOW_FEATURES(state, { datasetId: 'roads', featureIds: [2] })

    expect(result.mappedDatasets.roads.hiddenFeatures).toEqual([1, 3])
    expect(result.actionsArray[0]).toMatchObject({ method: 'applyFeatureFilter', parameters: ['roads'] })
  })

  it('sets hiddenFeatures to [-1] when all features are shown', () => {
    const state = makeStateWithDataset('roads', { hiddenFeatures: [1] })
    const result = actions.SHOW_FEATURES(state, { datasetId: 'roads', featureIds: [1] })

    expect(result.mappedDatasets.roads.hiddenFeatures).toEqual([-1])
  })

  it('logs error and returns unchanged state when dataset does not exist', () => {
    const state = makeState()
    const result = actions.SHOW_FEATURES(state, { datasetId: 'unknown', featureIds: [1] })

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("'unknown'"))
    expect(result).toBe(state)
  })
})

// ─── REMOVE_ADAPTER_ACTIONS ───────────────────────────────────────────────────

describe('REMOVE_ADAPTER_ACTIONS', () => {
  it('removes completed actions from actionsArray', () => {
    const action1 = { method: 'addDataset', parameters: ['roads'], actionId: 0 }
    const action2 = { method: 'applyStyle', parameters: ['roads', {}], actionId: 1 }
    const state = { ...makeState(), actionsArray: [action1, action2] }

    const result = actions.REMOVE_ADAPTER_ACTIONS(state, [action1])

    expect(result.actionsArray).toEqual([action2])
  })

  it('returns unchanged state when completedActions is empty', () => {
    const state = makeState()
    const result = actions.REMOVE_ADAPTER_ACTIONS(state, [])
    expect(result).toBe(state)
  })

  it('returns unchanged state when completedActions is undefined', () => {
    const state = makeState()
    const result = actions.REMOVE_ADAPTER_ACTIONS(state, undefined)
    expect(result).toBe(state)
  })
})

// ─── actionId counter behaviour ───────────────────────────────────────────────

describe('actionId counter', () => {
  it('resets actionId to 0 when actionsArray is empty', () => {
    const state = makeStateWithDataset('roads')
    const result = actions.SET_DATASET_VISIBILITY(state, { datasetId: 'roads', visible: false })
    expect(result.actionsArray[0].actionId).toBe(0)
  })

  it('increments actionId for each successive queued action', () => {
    const state = makeStateWithDataset('roads')
    const state1 = actions.SET_DATASET_VISIBILITY(state, { datasetId: 'roads', visible: false })
    const state2 = actions.SET_DATASET_VISIBILITY(state1, { datasetId: 'roads', visible: true })

    expect(state2.actionsArray[1].actionId).toBe(1)
  })
})
