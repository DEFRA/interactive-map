import { logger } from '../../../../../src/services/logger.js'

export const setData = ({ pluginState }, geojson, { datasetId }) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (dataset?.tiles) {
    logger.warn(`setData called on vector tile dataset "${datasetId}" — has no effect`)
    return
  }
  pluginState.layerAdapter?.setData(datasetId, geojson)
}
