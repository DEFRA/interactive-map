import { addKeyItem } from './addKeyItem.js'

describe('addKeyItem', () => {
  it('dispatches an ADD_KEY_ITEM action with the key definition', () => {
    const dispatch = jest.fn()

    addKeyItem({ pluginState: { dispatch } }, { id: 'map-key', groupLabel: 'Map key' })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'ADD_KEY_ITEM',
      payload: { id: 'map-key', groupLabel: 'Map key' }
    })
  })
})
