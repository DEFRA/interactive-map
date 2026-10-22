import { logger } from '../../../../src/services/logger.js'

export const setData = ({ pluginState: { datasetRegistry, layerAdapter } }, geojson, { datasetId }) => {
  const registryDataset = datasetRegistry?.getDataset(datasetId)
  if (!registryDataset) {
    logger.warn(`setData: Dataset with id ${datasetId} not found`)
    return
  }
  if (registryDataset?.tiles) {
    logger.warn(`setData called on vector tile dataset "${datasetId}" — has no effect`)
    return
  }
  layerAdapter?.setData(datasetId, geojson)
}
