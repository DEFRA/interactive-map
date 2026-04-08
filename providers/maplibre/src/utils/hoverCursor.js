/**
 * Attaches a mousemove listener that changes the map cursor to a pointer when
 * hovering over any of the specified layers.
 *
 * Line layers use a 10px tolerance bbox. Stroke layers that have a companion
 * fill layer are skipped — the fill handles hover. Fill and symbol layers use
 * exact point hit-testing.
 *
 * @param {Object} map - MapLibre map instance
 * @param {string[]} layerIds - Layer IDs to watch
 * @param {Function|null} prevHandler - Previous mousemove handler to remove
 * @returns {Function|null} The new handler, or null if layerIds is empty
 */
const splitLayers = (map, layerIds) => {
  const lineLayers = []
  const otherLayers = []
  for (const id of layerIds) {
    const type = map.getLayer(id).type
    if (type === 'line') {
      const fillId = id.endsWith('-stroke') ? id.slice(0, -7) : null // NOSONAR
      const hasFillCompanion = fillId !== null && layerIds.includes(fillId)
      if (!hasFillCompanion) {
        lineLayers.push(id)
      }
    } else {
      otherLayers.push(id)
    }
  }
  return { lineLayers, otherLayers }
}

export const setupHoverCursor = (map, layerIds, prevHandler) => {
  const canvas = map.getCanvas()

  if (prevHandler) {
    map.off('mousemove', prevHandler)
  }

  if (!layerIds?.length) {
    canvas.style.cursor = ''
    return null
  }

  const handler = (e) => {
    const existingLayers = layerIds.filter(id => map.getLayer(id))
    if (existingLayers.length === 0) {
      canvas.style.cursor = ''
      return
    }

    const { lineLayers, otherLayers } = splitLayers(map, existingLayers)
    const { x, y } = e.point
    const bbox = [[x - 10, y - 10], [x + 10, y + 10]]
    const lineHit = lineLayers.length > 0 && map.queryRenderedFeatures(bbox, { layers: lineLayers }).length > 0
    const otherHit = otherLayers.length > 0 && map.queryRenderedFeatures(e.point, { layers: otherLayers }).length > 0
    canvas.style.cursor = (lineHit || otherHit) ? 'pointer' : ''
  }

  map.on('mousemove', handler)
  return handler
}
