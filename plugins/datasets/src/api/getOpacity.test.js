import { getOpacity } from './getOpacity.js'
import { datasetRegistry } from '../registry/datasetRegistry.js'
import { logger } from '../../../../src/services/logger.js'

jest.mock('../registry/datasetRegistry.js', () => ({
  datasetRegistry: { getDataset: jest.fn() }
}))

jest.mock('../../../../src/services/logger.js', () => ({
  logger: { warn: jest.fn() }
}))

describe('getOpacity', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('global (no datasetId)', () => {
    it('returns globals.opacity when set', () => {
      const ctx = { pluginState: { globals: { opacity: 0.5 } } }
      expect(getOpacity(ctx)).toBe(0.5)
    })

    it('returns null when globals.opacity is undefined', () => {
      const ctx = { pluginState: { globals: {} } }
      expect(getOpacity(ctx)).toBeNull()
    })
  })

  describe('with datasetId', () => {
    it('returns opacity from the registry dataset', () => {
      datasetRegistry.getDataset.mockReturnValue({ opacity: 0.7 })
      const ctx = { pluginState: { globals: {} } }
      expect(getOpacity(ctx, { datasetId: 'my-dataset' })).toBe(0.7)
    })

    it('returns null when the dataset has no opacity property', () => {
      datasetRegistry.getDataset.mockReturnValue({})
      const ctx = { pluginState: { globals: {} } }
      expect(getOpacity(ctx, { datasetId: 'my-dataset' })).toBeNull()
    })

    it('returns null and warns when the dataset is not found', () => {
      datasetRegistry.getDataset.mockReturnValue(undefined)
      const ctx = { pluginState: { globals: {} } }
      expect(getOpacity(ctx, { datasetId: 'missing' })).toBeNull()
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('missing'))
    })
  })

  describe('with sublayerId', () => {
    it('combines datasetId and sublayerId for the registry lookup', () => {
      datasetRegistry.getDataset.mockReturnValue({ opacity: 0.3 })
      const ctx = { pluginState: { globals: {} } }
      getOpacity(ctx, { datasetId: 'parent', sublayerId: 'child' })
      expect(datasetRegistry.getDataset).toHaveBeenCalledWith('parent-child')
    })

    it('returns opacity for the combined id', () => {
      datasetRegistry.getDataset.mockReturnValue({ opacity: 0.3 })
      const ctx = { pluginState: { globals: {} } }
      expect(getOpacity(ctx, { datasetId: 'parent', sublayerId: 'child' })).toBe(0.3)
    })

    it('returns null and warns when the sublayer dataset is not found', () => {
      datasetRegistry.getDataset.mockReturnValue(undefined)
      const ctx = { pluginState: { globals: {} } }
      expect(getOpacity(ctx, { datasetId: 'parent', sublayerId: 'missing' })).toBeNull()
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('parent-missing'))
    })
  })
})
