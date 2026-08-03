import { MapProvider } from './mapProvider.js'

describe('MapProvider', () => {
  describe('isBaseMapReady', () => {
    it('throws an error indicating the subclass must implement isBaseMapReady()', () => {
      const provider = new MapProvider()
      expect(() => provider.isBaseMapReady()).toThrow('must implement isBaseMapReady()')
    })

    it('includes the instance name in the error message when name is set', () => {
      const provider = new MapProvider()
      provider.name = 'TestProvider'
      expect(() => provider.isBaseMapReady()).toThrow('TestProvider must implement isBaseMapReady()')
    })

    it('throws an Error instance', () => {
      const provider = new MapProvider()
      expect(() => provider.isBaseMapReady()).toThrow(Error)
    })
  })

  it('can be subclassed with an isBaseMapReady implementation', () => {
    class ConcreteProvider extends MapProvider {
      isBaseMapReady () {
        return true
      }
    }

    const provider = new ConcreteProvider()
    expect(provider.isBaseMapReady()).toBe(true)
  })
})
