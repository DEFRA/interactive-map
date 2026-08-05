import { loadDrawAdapter } from './loadDrawAdapter.js'
import { MaplibreDrawAdapter } from './maplibre/MaplibreDrawAdapter.js'
import { OLDrawAdapter } from './openlayers/OLDrawAdapter.js'

jest.mock('./maplibre/MaplibreDrawAdapter.js', () => ({
  MaplibreDrawAdapter: jest.fn(function (mapProvider, options) {
    this.mapProvider = mapProvider
    this.options = options
  })
}))

jest.mock('./openlayers/OLDrawAdapter.js', () => ({
  OLDrawAdapter: jest.fn(function (mapProvider, options) {
    this.mapProvider = mapProvider
    this.options = options
  })
}))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('loadDrawAdapter', () => {
  test('loads the MapLibre adapter for a MapLibreProvider', async () => {
    const mapProvider = { name: 'MapLibreProvider' }
    const options = { mapStyle: 'light' }

    const adapter = await loadDrawAdapter(mapProvider, options)

    expect(MaplibreDrawAdapter).toHaveBeenCalledWith(mapProvider, options)
    expect(OLDrawAdapter).not.toHaveBeenCalled()
    expect(adapter).toBeInstanceOf(MaplibreDrawAdapter)
  })

  test('loads the OpenLayers adapter for an OpenLayersProvider', async () => {
    const mapProvider = { name: 'OpenLayersProvider' }
    const options = { mapStyle: 'dark' }

    const adapter = await loadDrawAdapter(mapProvider, options)

    expect(OLDrawAdapter).toHaveBeenCalledWith(mapProvider, options)
    expect(MaplibreDrawAdapter).not.toHaveBeenCalled()
    expect(adapter).toBeInstanceOf(OLDrawAdapter)
  })

  test('throws for an unsupported map provider', async () => {
    await expect(loadDrawAdapter({ name: 'SomethingElse' }, {}))
      .rejects.toThrow('No draw adapter available for map provider "SomethingElse"')

    expect(MaplibreDrawAdapter).not.toHaveBeenCalled()
    expect(OLDrawAdapter).not.toHaveBeenCalled()
  })
})
