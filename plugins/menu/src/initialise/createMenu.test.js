import { createMenu } from './createMenu.js'
import { setDatasetRegistry } from '../registry/getDatasetRegistry.js'

jest.mock('../registry/getDatasetRegistry.js', () => ({
  setDatasetRegistry: jest.fn()
}))

const makeEventBus = () => ({
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn()
})

describe('createMenu', () => {
  it('registers a listener for datasets:registryReady', () => {
    const eventBus = makeEventBus()
    createMenu({ eventBus })
    expect(eventBus.on).toHaveBeenCalledWith('datasets:registryReady', setDatasetRegistry)
  })

  it('emits datasets:requestRegistry on creation', () => {
    const eventBus = makeEventBus()
    createMenu({ eventBus })
    expect(eventBus.emit).toHaveBeenCalledWith('datasets:requestRegistry')
  })

  it('remove() deregisters the datasets:registryReady listener', () => {
    const eventBus = makeEventBus()
    const { remove } = createMenu({ eventBus })
    remove()
    expect(eventBus.off).toHaveBeenCalledWith('datasets:registryReady', setDatasetRegistry)
  })
})
