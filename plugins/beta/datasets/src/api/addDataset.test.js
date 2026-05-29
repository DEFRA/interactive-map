import { addDataset } from './addDataset.js'

describe('addDataset', () => {
  it('dispatches ADD_DATASET with the dataset and mapStyle', () => {
    const dispatch = jest.fn()
    const dataset = { id: 'my-dataset', label: 'My Dataset' }
    const mapState = { mapStyle: { version: 8, layers: [] } }

    addDataset({ pluginState: { dispatch }, mapState }, dataset)

    expect(dispatch).toHaveBeenCalledWith({
      type: 'ADD_DATASET',
      payload: { dataset, mapStyle: mapState.mapStyle }
    })
  })

  // it('passes mapState.mapStyle directly as part of the payload', () => {
  //   const dispatch = jest.fn()
  //   const mapStyle = { version: 8, sources: {}, layers: [{ id: 'base' }] }
  //   const dataset = { id: 'roads' }

  //   addDataset({ pluginState: { dispatch }, mapState: { mapStyle } }, dataset)

  //   expect(dispatch).toHaveBeenCalledWith({
  //     type: 'ADD_DATASET',
  //     payload: { dataset, mapStyle }
  //   })
  // })
})
