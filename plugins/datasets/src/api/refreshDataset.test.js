import { refreshDataset } from './refreshDataset.js'
import { logger } from '../../../../src/services/logger.js'

jest.mock('../../../../src/services/logger.js')

describe('refreshDataset', () => {
  const dynamicSource = { refresh: jest.fn() }
  const mapProvider = { datasets: { dynamicSources: new Map([['parcels', dynamicSource]]) } }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('refreshes the dynamic GeoJSON dataset', () => {
    refreshDataset({ mapProvider }, 'parcels')

    expect(dynamicSource.refresh).toHaveBeenCalled()
  })

  it('warns and does nothing for a dataset that isn\'t dynamic GeoJSON', () => {
    refreshDataset({ mapProvider }, 'monuments')

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('monuments'))
  })

  it('warns and does nothing before the datasets are ready', () => {
    refreshDataset({ mapProvider: {} }, 'parcels')

    expect(dynamicSource.refresh).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('parcels'))
  })
})
