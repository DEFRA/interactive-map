import { flattenStyleProperties, toStyleChanges, definedOnly, mapStyleIds } from '../utils/flattenStyleProperties.js'
import { stripInternalProperties } from '../utils/stripInternalProperties.js'
import { logger } from '../../../../src/services/logger.js'

const SUPPORTED_GEOMETRY_TYPES = new Set(['Point', 'LineString', 'Polygon'])

// type: 'Feature' is defaulted below (both adapters mishandle it missing), but a missing or
// unsupported geometry is a genuine caller mistake, so that's rejected instead.
const isValidFeature = (feature) =>
  SUPPORTED_GEOMETRY_TYPES.has(feature.geometry?.type) && feature.geometry?.coordinates !== undefined

export const addFeature = ({ mapState, mapProvider, services }, feature) => {
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return
  }

  // A saved feature carries its style in properties, already flattened; a top-level
  // stroke/fill/strokeWidth, when given, replaces that prop's saved values.
  const { stroke, fill, strokeWidth, properties, ...featureRest } = feature
  const savedProperties = flattenStyleProperties(properties)
  const flatFeature = {
    type: 'Feature',
    ...featureRest,
    properties: definedOnly({
      ...savedProperties,
      ...toStyleChanges(savedProperties, { stroke, fill, strokeWidth }, mapStyleIds(mapState))
    })
  }

  if (!isValidFeature(flatFeature)) {
    logger.warn('addFeature: ignoring invalid GeoJSON feature', flatFeature)
    return
  }

  draw.add(flatFeature)
  eventBus.emit('draw:add', stripInternalProperties(flatFeature))
}
