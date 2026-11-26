import { createEngineMap } from './createEngineMap.js'
import CoreInteractiveMap from '../InteractiveMap/InteractiveMap.js'

jest.mock('../InteractiveMap/InteractiveMap.js', () => ({
  __esModule: true,
  default: class CoreInteractiveMap {
    constructor (id, options) {
      this.id = id
      this.options = options
    }
  }
}))

describe('createEngineMap', () => {
  const provider = { name: 'TestProvider' }
  const createProvider = jest.fn(() => provider)
  const InteractiveMap = createEngineMap(createProvider)

  beforeEach(() => createProvider.mockClear())

  test('creates the engine provider from mapProviderOptions and passes it as mapProvider', () => {
    const map = new InteractiveMap('map', { mapProviderOptions: { workerUrl: '/worker.mjs' }, mapLabel: 'Test map' })

    expect(map).toBeInstanceOf(CoreInteractiveMap)
    expect(createProvider).toHaveBeenCalledWith({ workerUrl: '/worker.mjs' })
    expect(map.id).toBe('map')
    expect(map.options).toEqual({ mapLabel: 'Test map', mapProvider: provider })
  })

  test('creates the provider with no options when none are given', () => {
    const map = new InteractiveMap('map')

    expect(createProvider).toHaveBeenCalledWith(undefined)
    expect(map.options).toEqual({ mapProvider: provider })
  })
})
