import { setData } from './setData.js'
import { logger } from '../../../../src/services/logger.js'

const layerAdapter = { setData: jest.fn() }

const datasetRegistry = { getDataset: jest.fn() }

jest.mock('../../../../src/services/logger.js')

describe('setData', () => {
  const geojson = { type: 'FeatureCollection', features: [] }
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls layerAdapter.setData with datasetId and geojson', () => {
    datasetRegistry.getDataset.mockReturnValue({ id: 'my-dataset' })

    setData({ pluginState: { datasetRegistry }, mapProvider: { datasets: layerAdapter } }, geojson, { datasetId: 'my-dataset' })

    expect(layerAdapter.setData).toHaveBeenCalledWith('my-dataset', geojson)
  })

  it('does nothing when the dataset is not found in the registry', () => {
    datasetRegistry.getDataset.mockReturnValue(undefined)

    setData({ pluginState: { datasetRegistry }, mapProvider: { datasets: layerAdapter } }, geojson, { datasetId: 'missing' })

    expect(layerAdapter.setData).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('missing'))
  })

  it('warns and does nothing when dataset is a vector tile dataset', () => {
    datasetRegistry.getDataset.mockReturnValue({
      id: 'tiles-dataset',
      tiles: ['https://example.com/{z}/{x}/{y}']
    })

    setData({ pluginState: { datasetRegistry }, mapProvider: { datasets: layerAdapter } }, geojson, { datasetId: 'tiles-dataset' })

    expect(layerAdapter.setData).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('tiles-dataset'))
  })

  it("doesn't throw when layerAdapter is undefined", () => {
    datasetRegistry.getDataset.mockReturnValue({ id: 'my-dataset' })
    // Should not throw even if layerAdapter is undefined
    expect(() =>
      setData({ pluginState: { datasetRegistry }, mapProvider: { datasets: undefined } }, geojson, { datasetId: 'my-dataset' })
    ).not.toThrow()
  })
})
