import { setFeatureVisibility } from './setFeatureVisibility.js'
import { datasetRegistry } from '../registry/datasetRegistry.js'
import { logger } from '../../../../src/services/logger.js'

jest.mock('../registry/datasetRegistry.js', () => ({
  datasetRegistry: { getDataset: jest.fn() }
}))

jest.mock('../../../../src/services/logger.js')

describe('setFeatureVisibility', () => {
  const dispatch = jest.fn()
  const featureIds = [1, 2, 3]
  const datasetId = 'my-dataset'

  beforeEach(() => {
    jest.clearAllMocks()
    datasetRegistry.getDataset.mockReturnValue({ idProperty: 'id', generateIds: false })
  })

  it('dispatches SHOW_FEATURES when visible is true', () => {
    setFeatureVisibility({ pluginState: { dispatch } }, true, featureIds, { datasetId })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SHOW_FEATURES',
      payload: { datasetId, featureIds }
    })
  })

  it('dispatches HIDE_FEATURES when visible is false', () => {
    setFeatureVisibility({ pluginState: { dispatch } }, false, featureIds, { datasetId })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'HIDE_FEATURES',
      payload: { datasetId, featureIds }
    })
  })

  it('uses null datasetId when options are not provided', () => {
    setFeatureVisibility({ pluginState: { dispatch } }, true, featureIds)

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SHOW_FEATURES',
      payload: { datasetId: null, featureIds }
    })
  })

  it('does not warn when dataset has idProperty set', () => {
    datasetRegistry.getDataset.mockReturnValue({ idProperty: 'parcel_id', generateIds: false })
    setFeatureVisibility({ pluginState: { dispatch } }, false, featureIds, { datasetId })
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('does not warn when dataset has generateIds set', () => {
    datasetRegistry.getDataset.mockReturnValue({ idProperty: null, generateIds: true })
    setFeatureVisibility({ pluginState: { dispatch } }, false, featureIds, { datasetId })
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('warns when dataset has neither idProperty nor generateIds', () => {
    datasetRegistry.getDataset.mockReturnValue({ idProperty: null, generateIds: false })
    setFeatureVisibility({ pluginState: { dispatch } }, false, featureIds, { datasetId })
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`"${datasetId}"`))
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('idProperty'))
  })

  it('does not warn or look up registry when datasetId is not provided', () => {
    setFeatureVisibility({ pluginState: { dispatch } }, false, featureIds)
    expect(datasetRegistry.getDataset).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })
})
