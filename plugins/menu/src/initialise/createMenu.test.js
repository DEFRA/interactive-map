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
  const menu = [{ id: 'datasets', type: 'radio', value: 'floodZones' }]

  it('dispatches SET_MENU with the menu and the built menu state', () => {
    const eventBus = makeEventBus()
    const dispatch = jest.fn()
    createMenu({ menu, eventBus, dispatch, pluginStateRef: {} })
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_MENU',
      payload: { menu, menuState: { datasets: 'floodZones' } }
    })
  })

  it('builds the menu state from the URL search params', () => {
    window.history.replaceState({}, '', '?datasets=other')
    const dispatch = jest.fn()
    createMenu({ menu, eventBus: makeEventBus(), dispatch, pluginStateRef: {} })
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_MENU',
      payload: { menu, menuState: { datasets: 'other' } }
    })
    window.history.replaceState({}, '', window.location.pathname)
  })

  it('calls requestOnce for the datasets registry', () => {
    const eventBus = makeEventBus()
    createMenu({ menu, eventBus, dispatch: jest.fn(), pluginStateRef: {} })
    expect(eventBus.requestOnce).toHaveBeenCalledWith('datasets:registry', setDatasetRegistry)
  })

  it('calls emitWhenRequested for menu:state', () => {
    const eventBus = makeEventBus()
    const pluginStateRef = { current: {} }
    createMenu({ menu, eventBus, dispatch: jest.fn(), pluginStateRef })
    expect(eventBus.emitWhenRequested).toHaveBeenCalledWith('menu:state', pluginStateRef)
  })
})
