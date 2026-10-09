import { removeSymbol } from './removeSymbol.js'

describe('removeSymbol', () => {
  it('dispatches a REMOVE_KEY_SYMBOL action with the key definition', () => {
    const dispatch = jest.fn()

    removeSymbol({ pluginState: { dispatch } }, { id: 'map-key' })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'REMOVE_KEY_SYMBOL',
      payload: { id: 'map-key' }
    })
  })
})
