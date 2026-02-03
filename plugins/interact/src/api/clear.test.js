import { clear } from './clear.js'

describe('clear', () => {
  it('clears selected features and removes location marker', () => {
    const dispatch = jest.fn()
    const remove = jest.fn()

    clear({
      pluginState: { dispatch },
      mapState: { markers: { remove } }
    })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'CLEAR_SELECTED_FEATURES'
    })
    expect(remove).toHaveBeenCalledWith('location')
  })
})
