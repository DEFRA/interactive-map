import { setFeatureVisibility } from './setFeatureVisibility.js'

describe('setFeatureVisibility', () => {
  const dispatch = jest.fn()
  const featureIds = [1, 2, 3]
  it('dispatches SHOW_FEATURES when visible is true', () => {
    setFeatureVisibility({ pluginState: { dispatch } }, true, featureIds, { datasetId: 'my-dataset' })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SHOW_FEATURES',
      payload: { datasetId: 'my-dataset', featureIds }
    })
  })

  it('dispatches HIDE_FEATURES when visible is false', () => {
    setFeatureVisibility({ pluginState: { dispatch } }, false, featureIds, { datasetId: 'my-dataset' })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'HIDE_FEATURES',
      payload: { datasetId: 'my-dataset', featureIds }
    })
  })

  it('uses undefined datasetId when options are not provided', () => {
    setFeatureVisibility({ pluginState: { dispatch } }, true, featureIds)

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SHOW_FEATURES',
      payload: { datasetId: undefined, featureIds }
    })
  })
})
