/**
 * Resolves a drawn point's symbol-config icon: registers its images with the OL provider (as
 * the MapLibre adapter does with its own provider), then writes the resolved image ids — normal,
 * active and selected — plus the anchor and pixel ratio they were drawn at back onto the OL
 * feature. core/styles.js renders the icon from these, and the provider's highlightFeatures.js
 * the selection ring.
 */

export const hasSymbolStyle = (properties) => !!(properties?.symbol || properties?.symbolSvgContent)

// The map's own pixelRatio (device pixel ratio × map-size scale factor) — the same source the
// datasets plugin rasterises its OL symbols at, so both draw them 1:1.
export const getPixelRatio = (mapProvider) => mapProvider?.map?.getPixelRatio?.() || 1

/**
 * Resolve one point feature's symbol image and write it back onto the feature.
 * A no-op for points with no symbol config (nothing to render as an icon).
 *
 * @param {Object} params
 * @param {Object} params.manager - OLDrawManager (needs store.source, mapStyle, symbolRegistry)
 * @param {Object} params.mapProvider - OpenLayersProvider (needs addSymbolsToMap and the
 *   active/selected image id lookups)
 * @param {import('ol/Feature.js').default} params.olFeature
 * @param {number} [params.pixelRatioOverride] - use this instead of the map's pixelRatio, for
 *   callers (MAP_SET_PIXEL_RATIO) that already have the freshly set value
 * @param {number} [params.refreshId] - set by refreshAllPointSymbols; the result is dropped if a
 *   newer refresh has started since
 * @returns {Promise<void>} rejects if the symbol's images couldn't be registered
 */
export const resolvePointSymbol = async ({ manager, mapProvider, olFeature, pixelRatioOverride, refreshId }) => {
  const properties = olFeature.getProperties()
  if (!hasSymbolStyle(properties)) {
    return
  }

  const { symbolRegistry, mapStyle } = manager
  const pixelRatio = pixelRatioOverride ?? getPixelRatio(mapProvider)

  await mapProvider.addSymbolsToMap([properties], mapStyle, symbolRegistry, pixelRatio)
  const symbolImageId = symbolRegistry.getSymbolImageId(properties, mapStyle, 'normal', pixelRatio)
  // Unresolvable (e.g. an unknown symbol id), deleted/cancelled while registering, or
  // superseded by a newer refresh (another size or style change)
  if (!symbolImageId || !manager.store.source.hasFeature(olFeature) || (refreshId !== undefined && refreshId !== manager.pointSymbolRefreshId)) {
    return
  }
  // One write, so the feature changes (and re-renders) once
  olFeature.setProperties({
    symbolImageId,
    symbolActiveImageId: mapProvider.getActiveSymbolImageId(symbolImageId),
    symbolSelectedImageId: mapProvider.getSelectedSymbolImageId(symbolImageId),
    symbolImageAnchor: symbolRegistry.getSymbolDef(properties).anchor,
    // ol/style/Icon draws its source canvas at native pixel size — core/styles.js reads this
    // back to apply `scale: 1 / symbolPixelRatio`, correcting for the canvas being rasterised
    // at pixelRatio device pixels for crispness.
    symbolPixelRatio: pixelRatio
  })
}

/**
 * Re-resolve every existing drawn point's symbol — called on map style/size change, since
 * the rasterised image (colours, and pixel-ratio-scaled dimensions) depends on both.
 *
 * @param {Object} params
 * @param {Object} params.manager
 * @param {Object} params.mapProvider
 * @param {number} [params.pixelRatioOverride] - see resolvePointSymbol
 * @returns {Promise<void>}
 */
export const refreshAllPointSymbols = ({ manager, mapProvider, pixelRatioOverride }) => {
  // Refreshes overlap when the map size or style changes again before one finishes; only the
  // latest may write back, so an older one finishing last can't restore its stale images
  manager.pointSymbolRefreshId = (manager.pointSymbolRefreshId ?? 0) + 1
  const refreshId = manager.pointSymbolRefreshId
  const points = manager.store.source.getFeatures().filter(
    (feature) => feature.getGeometry()?.getType() === 'Point' && hasSymbolStyle(feature.getProperties())
  )
  return Promise.all(points.map((olFeature) => resolvePointSymbol({ manager, mapProvider, olFeature, pixelRatioOverride, refreshId })))
}
