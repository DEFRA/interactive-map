/**
 * Build a filter that excludes specific features by ID property
 * Coerces values to strings for comparison to handle mixed number/string types
 */
export const buildExclusionFilter = (originalFilter, idProperty, excludeIds) => {
  if (!excludeIds || excludeIds.length === 0) {
    return originalFilter
  }

  // Coerce both sides to strings to handle number/string type mismatches
  const stringIds = excludeIds.map(id => String(id))
  const exclusionFilter = ['!', ['in', ['to-string', ['get', idProperty]], ['literal', stringIds]]]

  if (!originalFilter) {
    return exclusionFilter
  }

  return ['all', originalFilter, exclusionFilter]
}

/**
 * Apply exclusion filter to a map layer
 */
export const applyExclusionFilter = (map, layerId, originalFilter, idProperty, excludeIds) => {
  if (!map.getLayer(layerId)) {
    return
  }

  const filter = buildExclusionFilter(originalFilter, idProperty, excludeIds)
  map.setFilter(layerId, filter)
}
