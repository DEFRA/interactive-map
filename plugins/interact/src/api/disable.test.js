import { disable } from './disable.js'

describe('disable', () => {
  it('dispatches DISABLE action once without payload', () => {
    const dispatch = jest.fn()

    disable({ pluginState: { dispatch } })

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({ type: 'DISABLE' })
  })
})
