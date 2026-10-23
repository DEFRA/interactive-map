import { loadLayerAdapter } from './loadLayerAdapter.js'

const makeAdapterInstance = (type) => ({
  type,
  removeDataset: jest.fn(),
  setData: jest.fn(),
  applyStyle: jest.fn(),
  applyDatasetVisibility: jest.fn(),
  applyGlobalVisibility: jest.fn(),
  applyDatasetOpacity: jest.fn(),
  applyGlobalOpacity: jest.fn(),
  addDataset: jest.fn(),
  applyFeatureFilter: jest.fn(),
  onMapStyleChange: jest.fn(),
  onMapSizeChange: jest.fn()
})

jest.mock('./maplibre/maplibreLayerAdapter.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => makeAdapterInstance('maplibre'))
}))
jest.mock('./esri/esriLayerAdapter.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => makeAdapterInstance('esri'))
}))
jest.mock('./openlayers/openlayersLayerAdapter.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => makeAdapterInstance('openlayers'))
}))

const makeMapProvider = (name) => ({ name })
const symbolRegistry = {}
const patternRegistry = {}
const datasetRegistry = {}

describe('loadLayerAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('loads the MapLibre adapter for MapLibreProvider', async () => {
    const mapProvider = makeMapProvider('MapLibreProvider')
    const adapter = await loadLayerAdapter(mapProvider, symbolRegistry, patternRegistry)
    expect(adapter.type).toBe('maplibre')
  })

  it('loads the Esri adapter for EsriProvider', async () => {
    const mapProvider = makeMapProvider('EsriProvider')
    const adapter = await loadLayerAdapter(mapProvider, symbolRegistry, patternRegistry)
    expect(adapter.type).toBe('esri')
  })

  it('loads the OpenLayers adapter for OpenLayersProvider', async () => {
    const mapProvider = makeMapProvider('OpenLayersProvider')
    const adapter = await loadLayerAdapter(mapProvider, symbolRegistry, patternRegistry)
    expect(adapter.type).toBe('openlayers')
  })

  it('passes the registries through to the adapter constructor', async () => {
    const OpenLayersLayerAdapter = (await import('./openlayers/openlayersLayerAdapter.js')).default
    const mapProvider = makeMapProvider('OpenLayersProvider')
    await loadLayerAdapter(mapProvider, symbolRegistry, patternRegistry, datasetRegistry)
    expect(OpenLayersLayerAdapter).toHaveBeenCalledWith(mapProvider, symbolRegistry, patternRegistry, datasetRegistry)
  })

  it('throws for an unknown provider', async () => {
    const mapProvider = makeMapProvider('UnknownProvider')
    await expect(loadLayerAdapter(mapProvider, symbolRegistry, patternRegistry))
      .rejects.toThrow('No layer adapter available for map provider UnknownProvider')
  })

  it('returns a new adapter instance for each call', async () => {
    const mapProvider = makeMapProvider('MapLibreProvider')
    const adapterA = await loadLayerAdapter(mapProvider, symbolRegistry, patternRegistry, datasetRegistry)
    const adapterB = await loadLayerAdapter(mapProvider, symbolRegistry, patternRegistry, datasetRegistry)
    expect(adapterA).not.toBe(adapterB)
  })
})
