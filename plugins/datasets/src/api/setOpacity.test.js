import { setOpacity } from './setOpacity.js'

describe('setOpacity', () => {
  const dispatch = jest.fn()
  it('dispatches SET_OPACITY when datasetId is provided', () => {
    setOpacity({ pluginState: { dispatch } }, 0.5, { datasetId: 'my-dataset' })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_OPACITY',
      payload: { datasetId: 'my-dataset', opacity: 0.5 }
    })
  })

  it('combines datasetId and sublayerId for the dispatched datasetId', () => {
    setOpacity({ pluginState: { dispatch } }, 0.4, { datasetId: 'parent', sublayerId: 'child' })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_OPACITY',
      payload: { datasetId: 'parent-child', opacity: 0.4 }
    })
  })

  it('dispatches SET_GLOBAL_OPACITY when no datasetId is provided', () => {
    setOpacity({ pluginState: { dispatch } }, 0.8, {})

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_GLOBAL_OPACITY',
      payload: { opacity: 0.8 }
    })
  })
})
