import { flattenStyleProperties } from '../utils/flattenStyleProperties.js'
import { stripInternalProperties } from '../utils/stripInternalProperties.js'
import { logger } from '../../../../src/services/logger.js'

const SUPPORTED_GEOMETRY_TYPES = new Set(['Point', 'LineString', 'Polygon'])

// type: 'Feature' is defaulted below (both adapters mishandle it missing), but a missing or
// unsupported geometry is a genuine caller mistake, so that's rejected instead.
const isValidFeature = (feature) =>
  SUPPORTED_GEOMETRY_TYPES.has(feature.geometry?.type) && feature.geometry?.coordinates !== undefined

export const addFeature = ({ mapProvider, services }, feature) => {
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return
  }

  const { stroke, fill, strokeWidth, properties, ...featureRest } = feature
  const flatFeature = {
    type: 'Feature',
    ...featureRest,
    properties: {
      ...properties,
      ...flattenStyleProperties({ stroke, fill, strokeWidth })
    }
  }

  if (!isValidFeature(flatFeature)) {
    logger.warn('addFeature: ignoring invalid GeoJSON feature', flatFeature)
    return
  }

  draw.add(flatFeature)
  eventBus.emit('draw:add', stripInternalProperties(flatFeature))
}
