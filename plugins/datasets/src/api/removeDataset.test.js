import { removeDataset } from './removeDataset.js'

const layerAdapter = { removeDataset: jest.fn() }

describe('removeDataset', () => {
  const dispatch = jest.fn()
  it('calls layerAdapter.removeDataset with the datasetId', () => {
    removeDataset({ pluginState: { dispatch }, mapProvider: { datasets: layerAdapter } }, 'my-dataset')

    expect(layerAdapter.removeDataset).toHaveBeenCalledWith('my-dataset')
  })

  it('dispatches REMOVE_DATASET with the datasetId', () => {
    removeDataset({ pluginState: { dispatch }, mapProvider: { datasets: layerAdapter } }, 'my-dataset')

    expect(dispatch).toHaveBeenCalledWith({
      type: 'REMOVE_DATASET',
      payload: { id: 'my-dataset' }
    })
  })

  it('calls layerAdapter.removeDataset before dispatching', () => {
    const callOrder = []
    dispatch.mockImplementationOnce(() => callOrder.push('dispatch'))
    layerAdapter.removeDataset.mockImplementationOnce(() => callOrder.push('adapter'))

    removeDataset({ pluginState: { dispatch }, mapProvider: { datasets: layerAdapter } }, 'my-dataset')

    expect(callOrder).toEqual(['adapter', 'dispatch'])
  })

  it('still dispatches REMOVE_DATASET when layerAdapter is undefined', () => {
    removeDataset({ pluginState: { dispatch }, mapProvider: { datasets: undefined } }, 'my-dataset')

    expect(dispatch).toHaveBeenCalledWith({
      type: 'REMOVE_DATASET',
      payload: { id: 'my-dataset' }
    })
  })
})
