import { addSymbol } from './addSymbol.js'

describe('addSymbol', () => {
  it('dispatches an ADD_KEY_SYMBOL action with the key definition', () => {
    const dispatch = jest.fn()

    addSymbol({ pluginState: { dispatch } }, { id: 'map-key', groupLabel: 'Map key' })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'ADD_KEY_SYMBOL',
      payload: { id: 'map-key', groupLabel: 'Map key' }
    })
  })
})
