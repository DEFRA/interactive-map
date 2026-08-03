import { setStyle } from './setStyle.js'

describe('setStyle', () => {
  it('dispatches SET_DATASET_STYLE with datasetId, styleChanges, and mapStyle', () => {
    const dispatch = jest.fn()
    const mapStyle = { version: 8, layers: [] }
    const styleChanges = { fill: 'blue' }

    setStyle({ pluginState: { dispatch }, mapState: { mapStyle } }, styleChanges, { datasetId: 'my-dataset' })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_DATASET_STYLE',
      payload: { datasetId: 'my-dataset', styleChanges, mapStyle }
    })
  })

  it('combines datasetId and sublayerId for the dispatched datasetId', () => {
    const dispatch = jest.fn()
    const mapStyle = { version: 8, layers: [] }
    const styleChanges = { stroke: 'red' }

    setStyle({ pluginState: { dispatch }, mapState: { mapStyle } }, styleChanges, { datasetId: 'parent', sublayerId: 'child' })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_DATASET_STYLE',
      payload: { datasetId: 'parent-child', styleChanges, mapStyle }
    })
  })

  it('passes mapState.mapStyle in the payload', () => {
    const dispatch = jest.fn()
    const mapStyle = { version: 8, sources: { s: {} }, layers: [{ id: 'base' }] }

    setStyle({ pluginState: { dispatch }, mapState: { mapStyle } }, {}, { datasetId: 'ds' })

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ mapStyle }) })
    )
  })

  it('uses undefined datasetId when options are not provided', () => {
    const dispatch = jest.fn()
    const mapStyle = { version: 8, layers: [] }
    const styleChanges = { fill: 'green' }

    setStyle({ pluginState: { dispatch }, mapState: { mapStyle } }, styleChanges)

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_DATASET_STYLE',
      payload: { datasetId: undefined, styleChanges, mapStyle }
    })
  })
})
