import { mergePolygons } from '../utils/spatial.js'

/**
 * Merge multiple contiguous polygons into a single polygon.
 *
 * Pure computation, like split — this does not touch the feature store. The
 * caller is responsible for deleting the original features and adding the
 * merged result (see the draw:merge event).
 *
 * @param {object} context - plugin context
 * @param {string[]} featureIds - IDs of the polygons to merge
 * @returns {object|null} the merged GeoJSON feature, or null if the merge failed
 */
export const merge = ({ mapProvider, services }, featureIds) => {
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return null
  }

  const polygons = featureIds.map((id) => draw.get(id))
  const feature = mergePolygons(polygons)

  if (feature) {
    eventBus.emit('draw:merge', { originalFeatureIds: featureIds, feature })
  }

  return feature
}
