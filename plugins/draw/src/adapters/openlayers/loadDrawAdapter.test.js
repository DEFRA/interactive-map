import { loadDrawAdapter } from './loadDrawAdapter.js'
import { OLDrawAdapter } from './OLDrawAdapter.js'

jest.mock('./OLDrawAdapter.js', () => ({
  OLDrawAdapter: jest.fn(function (mapProvider, options) {
    this.mapProvider = mapProvider
    this.options = options
  })
}))

describe('loadDrawAdapter (OpenLayers engine package)', () => {
  test('creates the OpenLayers adapter', async () => {
    const mapProvider = { name: 'OpenLayersProvider' }
    const options = { mapStyle: 'dark' }

    const adapter = await loadDrawAdapter(mapProvider, options)

    expect(OLDrawAdapter).toHaveBeenCalledWith(mapProvider, options)
    expect(adapter).toBeInstanceOf(OLDrawAdapter)
  })
})
