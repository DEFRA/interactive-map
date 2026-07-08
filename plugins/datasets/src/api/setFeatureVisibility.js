import { logger } from '../../../../src/services/logger.js'
import { datasetRegistry } from '../registry/datasetRegistry.js'

export const setFeatureVisibility = ({ pluginState: { dispatch } }, visible, featureIds, { datasetId = null } = {}) => {
  if (datasetId) {
    const dataset = datasetRegistry.getDataset(datasetId)
    if (dataset && !dataset.idProperty && !dataset.generateIds) {
      logger.warn(`setFeatureVisibility: Dataset "${datasetId}" has no idProperty or generateIds configured. Features may not be matched correctly. Add idProperty to match by a feature property, or add generateIds: true to use auto-generated IDs.`)
    }
  }
  const type = visible ? 'SHOW_FEATURES' : 'HIDE_FEATURES'
  dispatch({ type, payload: { datasetId, featureIds } })
}
