import { getStyle } from './getStyle.js'
import { datasetRegistry } from '../registry/datasetRegistry.js'
import { logger } from '../../../../../src/services/logger.js'

jest.mock('../registry/datasetRegistry.js', () => ({
  datasetRegistry: { getDataset: jest.fn() }
}))

jest.mock('../../../../../src/services/logger.js', () => ({
  logger: { warn: jest.fn() }
}))

describe('getStyle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns the style for a known dataset', () => {
    const style = { fill: 'blue', stroke: 'red' }
    datasetRegistry.getDataset.mockReturnValue({ style })
    expect(getStyle({}, { datasetId: 'roads' })).toBe(style)
  })

  it('returns style for the combined sublayer id', () => {
    const style = { fill: 'green' }
    datasetRegistry.getDataset.mockReturnValue({ style })
    expect(getStyle({}, { datasetId: 'parent', sublayerId: 'child' })).toBe(style)
    expect(datasetRegistry.getDataset).toHaveBeenCalledWith('parent-child')
  })

  it('returns null and warns when a sublayer dataset is not found', () => {
    datasetRegistry.getDataset.mockReturnValue(undefined)
    expect(getStyle({}, { datasetId: 'parent', sublayerId: 'missing' })).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('parent-missing'))
  })

  it('uses undefined datasetId when options argument is omitted', () => {
    datasetRegistry.getDataset.mockReturnValue(undefined)
    expect(getStyle({})).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith('getStyle: Dataset with id undefined not found')
  })
})
