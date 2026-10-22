import { logger } from '../../../../src/services/logger.js'

export const getOpacity = ({ pluginState: { globals, datasetRegistry } }, options = {}) => {
  const { datasetId, sublayerId } = options
  const fullId = sublayerId ? `${datasetId}-${sublayerId}` : datasetId
  if (fullId) {
    const registryDataset = datasetRegistry?.getDataset(fullId)
    if (!registryDataset) {
      logger.warn(`getOpacity: Dataset with id ${fullId} not found`)
      return null
    }
    return registryDataset.opacity ?? null
  }
  // Global
  return globals.opacity ?? null
}
