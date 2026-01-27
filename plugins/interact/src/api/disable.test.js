import { disable } from './disable.js'

describe('disable', () => {
  it('dispatches DISABLE action', () => {
    const mockDispatch = jest.fn()
    const params = {
      pluginState: { dispatch: mockDispatch }
    }

    disable(params)

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'DISABLE' })
  })

  it('does not include payload', () => {
    const mockDispatch = jest.fn()
    const params = {
      pluginState: { dispatch: mockDispatch }
    }

    disable(params)

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'DISABLE' })
    expect(mockDispatch.mock.calls[0][0]).not.toHaveProperty('payload')
  })

  it('calls dispatch exactly once', () => {
    const mockDispatch = jest.fn()
    const params = {
      pluginState: { dispatch: mockDispatch }
    }

    disable(params)

    expect(mockDispatch).toHaveBeenCalledTimes(1)
  })
})
