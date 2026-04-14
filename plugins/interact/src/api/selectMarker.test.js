import { selectMarker } from './selectMarker.js'

describe('selectMarker', () => {
  it('dispatches SELECT_MARKER with markerId and multiSelect from pluginState', () => {
    const dispatch = jest.fn()

    selectMarker({ pluginState: { dispatch, multiSelect: false } }, 'm1')

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SELECT_MARKER',
      payload: { markerId: 'm1', multiSelect: false }
    })
  })

  it('passes multiSelect: true when pluginState.multiSelect is true', () => {
    const dispatch = jest.fn()

    selectMarker({ pluginState: { dispatch, multiSelect: true } }, 'm1')

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SELECT_MARKER',
      payload: { markerId: 'm1', multiSelect: true }
    })
  })
})
