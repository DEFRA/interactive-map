import { loadDrawAdapter } from './loadDrawAdapter.js'
import { MaplibreDrawAdapter } from './MaplibreDrawAdapter.js'

jest.mock('./MaplibreDrawAdapter.js', () => ({
  MaplibreDrawAdapter: jest.fn(function (mapProvider, options) {
    this.mapProvider = mapProvider
    this.options = options
  })
}))

describe('loadDrawAdapter (MapLibre engine package)', () => {
  test('creates the MapLibre adapter', async () => {
    const mapProvider = { name: 'MapLibreProvider' }
    const options = { mapStyle: 'light' }

    const adapter = await loadDrawAdapter(mapProvider, options)

    expect(MaplibreDrawAdapter).toHaveBeenCalledWith(mapProvider, options)
    expect(adapter).toBeInstanceOf(MaplibreDrawAdapter)
  })
})
