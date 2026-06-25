import { setDatasetVisibility } from './setDatasetVisibility.js'

describe('setDatasetVisibility', () => {
  const dispatch = jest.fn()
  it('dispatches SET_DATASET_VISIBILITY with visible false', () => {
    setDatasetVisibility({ pluginState: { dispatch } }, false, { datasetId: 'my-dataset' })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_DATASET_VISIBILITY',
      payload: { datasetId: 'my-dataset', visible: false }
    })
  })

  it('combines datasetId and sublayerId for the dispatched id', () => {
    setDatasetVisibility({ pluginState: { dispatch } }, true, { datasetId: 'parent', sublayerId: 'child' })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_DATASET_VISIBILITY',
      payload: { datasetId: 'parent-child', visible: true }
    })
  })

  it('dispatches SET_GLOBAL_VISIBILITY when ids defaults to empty object', () => {
    setDatasetVisibility({ pluginState: { dispatch } }, false)

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_GLOBAL_VISIBILITY',
      payload: { visible: false }
    })
  })
})
