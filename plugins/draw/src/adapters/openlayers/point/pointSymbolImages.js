import { symbolRegistry } from '../../../../../../src/services/symbolRegistry.js'
import { getOrCreateSymbolImage } from '../../../../../../providers/beta/openlayers/src/utils/symbolImages.js'

/**
 * Resolves a drawn point's symbol-config icon (the same schema addMarker and dataset point
 * features use — symbol/symbolSvgContent/symbolBackgroundColor/etc., see
 * src/config/symbolConfig.js) and writes the resolved image id back onto the OL feature, so
 * core/styles.js's createFeatureStyle() can render it via an ol/style/Icon.
 *
 * Unlike the MapLibre adapter, this needs no icon-offset-style anchor compensation — OL's
 * Icon style takes a fully fractional anchor natively (anchorXUnits/anchorYUnits default to
 * 'fraction', see ol/style/Icon.js), so the exact symbolAnchor value is usable as-is. It also
 * needs no equivalent of the MapLibre adapter's draw.add()-as-a-render-forcing-workaround —
 * ol.Feature#set() already fires a change event the VectorSource listens to, so a plain
 * property write here is enough to trigger a re-render on its own.
 */

export const hasSymbolStyle = (properties) => !!(properties?.symbol || properties?.symbolSvgContent)

// OL has no map-level "pixel ratio" of its own to read back the way MapLibre does (nothing
// here calls an equivalent of map.setPixelRatio()) — mapProvider.drawScale is this app's own
// map-size scale factor (see olDraw.js's MAP_SET_SIZE handler), tracked independently of the
// browser's native devicePixelRatio, so both are combined here to match MapController.jsx's
// own construction-time formula.
export const getPixelRatio = (mapProvider) => (globalThis.devicePixelRatio || 1) * (mapProvider?.drawScale ?? 1)

/**
 * Resolve one point feature's symbol image and write it back onto the feature.
 * A no-op for points with no symbol config (nothing to render as an icon).
 *
 * @param {Object} params
 * @param {Object} params.manager - OLDrawManager (needs store.source, mapStyle)
 * @param {Object} params.mapProvider
 * @param {import('ol/Feature.js').default} params.olFeature
 * @returns {Promise<void>}
 */
export const resolvePointSymbol = async ({ manager, mapProvider, olFeature }) => {
  const properties = olFeature.getProperties()
  if (!hasSymbolStyle(properties)) {
    return
  }

  const pixelRatio = getPixelRatio(mapProvider)

  try {
    const result = await symbolRegistry.rasteriseSymbolImage(properties, manager.mapStyle, 'normal', pixelRatio)
    if (!result) {
      return
    }
    getOrCreateSymbolImage(result.imageId, result.imageData)

    // The feature may have been deleted/cancelled while rasterising was in flight.
    if (!manager.store.source.hasFeature(olFeature)) {
      return
    }
    olFeature.set('symbolImageId', result.imageId)
    // Unlike MapLibre's map.addImage(id, data, {pixelRatio}) — which uses the registered
    // pixelRatio to auto-derive the icon's displayed CSS size (width/pixelRatio) — ol/style/
    // Icon has no such correction and draws its source canvas at native pixel size by default.
    // The canvas here was rasterised at viewBox × pixelRatio device pixels for crispness, so
    // without a matching scale-down the icon renders pixelRatio× too big (and blurry, from the
    // browser upscaling an oversized canvas). core/styles.js reads this back to apply
    // `scale: 1 / symbolPixelRatio`, keeping the displayed size constant at the symbol's
    // viewBox size regardless of device pixel ratio or map-size scale — the same effectively-
    // constant sizing the MapLibre adapter gets from addImage's pixelRatio handling.
    olFeature.set('symbolPixelRatio', pixelRatio)
  } catch (err) {
    // A silent failure here means a point simply never gets/keeps an icon, with nothing in
    // the UI to explain why — surface it instead of letting the rejection vanish.
    console.error('[draw] failed to resolve point symbol', olFeature.getId(), err) // NOSONAR
  }
}

/**
 * Re-resolve every existing drawn point's symbol — called on map style/size change, since
 * the rasterised image (colours, and pixel-ratio-scaled dimensions) depends on both.
 *
 * @param {Object} params
 * @param {Object} params.manager
 * @param {Object} params.mapProvider
 * @returns {Promise<void>}
 */
export const refreshAllPointSymbols = ({ manager, mapProvider }) => {
  const points = manager.store.source.getFeatures().filter(
    (f) => f.getGeometry()?.getType() === 'Point' && hasSymbolStyle(f.getProperties())
  )
  return Promise.all(points.map((olFeature) => resolvePointSymbol({ manager, mapProvider, olFeature })))
}
