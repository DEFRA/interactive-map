/**
 * Delete a feature from the draw layer by ID.
 *
 * @param {object} context - plugin context
 * @param {string} featureId - ID of the feature to delete
 */
export const deleteFeature = ({ mapProvider }, featureId) => {
  const { draw } = mapProvider
  if (!draw) return
  draw.delete(featureId)
}
