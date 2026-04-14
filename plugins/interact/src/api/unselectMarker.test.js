import { unselectMarker } from './unselectMarker.js'

describe('unselectMarker', () => {
  it('dispatches UNSELECT_MARKER with markerId', () => {
    const dispatch = jest.fn()

    unselectMarker({ pluginState: { dispatch } }, 'm1')

    expect(dispatch).toHaveBeenCalledWith({
      type: 'UNSELECT_MARKER',
      payload: { markerId: 'm1' }
    })
  })
})
