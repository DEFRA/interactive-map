import { logger } from '../../../../../src/services/logger.js'
import { datasetRegistry } from '../registry/datasetRegistry.js'

export const getStyle = ({ pluginState }, { datasetId, sublayerId } = {}) => {
  datasetId = sublayerId ? `${datasetId}-${sublayerId}` : datasetId
  const registryDataset = datasetRegistry.getDataset(datasetId)
  if (!registryDataset) {
    logger.warn(`getStyle: Dataset with id ${datasetId} not found`)
    return null
  }
  return registryDataset.style
}
