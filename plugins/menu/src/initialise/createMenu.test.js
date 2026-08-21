import { createMenu } from './createMenu.js'
import { setDatasetRegistry } from '../registry/getDatasetRegistry.js'

jest.mock('../registry/getDatasetRegistry.js', () => ({
  setDatasetRegistry: jest.fn()
}))

const makeEventBus = () => ({
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  requestOnce: jest.fn(),
  emitWhenRequested: jest.fn()
})

describe('createMenu', () => {
  it('dispatches SET_MENU with the menu', () => {
    const eventBus = makeEventBus()
    const dispatch = jest.fn()
    const menu = [{ id: 'layer1' }]
    createMenu({ menu, eventBus, dispatch, pluginStateRef: {} })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MENU', payload: { menu } })
  })

  it('calls requestOnce for the datasets registry', () => {
    const eventBus = makeEventBus()
    createMenu({ eventBus, dispatch: jest.fn(), pluginStateRef: {} })
    expect(eventBus.requestOnce).toHaveBeenCalledWith('datasets:registry', setDatasetRegistry)
  })

  it('calls emitWhenRequested for menu:state', () => {
    const eventBus = makeEventBus()
    const pluginStateRef = { current: {} }
    createMenu({ eventBus, dispatch: jest.fn(), pluginStateRef })
    expect(eventBus.emitWhenRequested).toHaveBeenCalledWith('menu:state', pluginStateRef)
  })
})
