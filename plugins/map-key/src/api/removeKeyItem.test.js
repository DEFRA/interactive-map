import { removeKeyItem } from './removeKeyItem.js'

describe('removeKeyItem', () => {
  it('dispatches a REMOVE_KEY_ITEM action with the key definition', () => {
    const dispatch = jest.fn()

    removeKeyItem({ pluginState: { dispatch } }, { id: 'map-key' })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'REMOVE_KEY_ITEM',
      payload: { id: 'map-key' }
    })
  })
})
