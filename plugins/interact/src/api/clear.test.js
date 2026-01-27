import { clear } from './clear.js'

describe('clear', () => {
  let mockDispatch
  let mockMarkersRemove
  let params

  beforeEach(() => {
    mockDispatch = jest.fn()
    mockMarkersRemove = jest.fn()
    params = {
      pluginState: { dispatch: mockDispatch },
      mapState: { markers: { remove: mockMarkersRemove } }
    }
  })

  it('dispatches CLEAR_SELECTED_FEATURES action', () => {
    clear(params)

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLEAR_SELECTED_FEATURES' })
  })

  it('calls mapState.markers.remove with "location"', () => {
    clear(params)

    expect(mockMarkersRemove).toHaveBeenCalledWith('location')
  })

  it('calls both dispatch and markers.remove', () => {
    clear(params)

    expect(mockDispatch).toHaveBeenCalledTimes(1)
    expect(mockMarkersRemove).toHaveBeenCalledTimes(1)
  })
})
