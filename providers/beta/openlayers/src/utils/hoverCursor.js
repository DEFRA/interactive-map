const HIGHLIGHT_MARKER = '_highlight'
const HIT_TOLERANCE = 8

// Layers are classified by a `layerType` tag ('vector' | 'vectorTile') set at creation,
// not `instanceof VectorLayer`/`VectorTileLayer` — a UMD consumer loads this provider and
// other plugins (e.g. draw) as independently-bundled scripts, each with its own copy of
// ol, so a class reference from this bundle never matches an instance built by another.
const isInteractiveFeature = (feature, layer, layerSet) => {
  if (layer.get('layerType') === 'vectorTile') {
    const styleLayerId = feature.get('mapbox-layer')?.id
    return Boolean(styleLayerId && layerSet.has(styleLayerId))
  }
  if (layer.get('layerType') === 'vector' && !layer.get(HIGHLIGHT_MARKER)) {
    const layerId = layer.get('layerId')
    return Boolean(layerId && layerSet.has(layerId))
  }
  return false
}

/**
 * Attaches a pointermove listener that changes the map cursor to a pointer when
 * hovering over any of the specified layers. Only fires for mouse pointer events
 * so touch interactions are unaffected.
 *
 * @param {import('ol/Map').default} map - OL map instance
 * @param {string[]} layerIds - Layer IDs to watch
 * @param {Function|null} prevHandler - Previous pointermove handler to remove
 * @returns {Function|null} The new handler, or null if layerIds is empty
 */
export const setupHoverCursor = (map, layerIds, prevHandler) => {
  const viewport = map.getViewport()

  if (prevHandler) {
    map.un('pointermove', prevHandler)
  }

  if (!layerIds?.length) {
    viewport.style.cursor = ''
    return null
  }

  const layerSet = new Set(layerIds)
  let rafId = null

  const handler = (e) => {
    if (e.originalEvent?.pointerType !== 'mouse') {
      return
    }
    const pixel = e.pixel
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
    }
    rafId = requestAnimationFrame(() => {
      rafId = null
      const hit = map.forEachFeatureAtPixel(
        pixel,
        (feature, layer) => isInteractiveFeature(feature, layer, layerSet),
        { hitTolerance: HIT_TOLERANCE }
      )
      viewport.style.cursor = hit ? 'pointer' : ''
    })
  }

  map.on('pointermove', handler)
  return handler
}
