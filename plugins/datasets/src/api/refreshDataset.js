import { logger } from '../../../../src/services/logger.js'

/**
 * Reload a dynamic GeoJSON dataset: clear the features it holds and fetch the current view again.
 */
export const refreshDataset = ({ mapProvider }, datasetId) => {
  const dynamicSource = mapProvider.datasets?.dynamicSources?.get(datasetId)
  if (!dynamicSource) {
    logger.warn(`refreshDataset: no dynamic GeoJSON dataset "${datasetId}" — has no effect`)
    return
  }
  dynamicSource.refresh()
}
