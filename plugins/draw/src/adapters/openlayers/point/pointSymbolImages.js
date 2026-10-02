import { symbolRegistry } from '../../../../../../src/services/symbolRegistry.js'
import { getOrCreateSymbolImage } from '../../../../../../providers/beta/openlayers/src/utils/symbolImages.js'

/**
 * Resolves a drawn point's symbol-config icon and writes the resolved image id back onto the
 * OL feature, so core/styles.js's createFeatureStyle() can render it via an ol/style/Icon.
 * Also resolves and caches the 'active'/'selected' variants as symbolActiveImageId/
 * symbolSelectedImageId, read directly by highlightFeatures.js's selection overlay.
 */

const VARIANTS = ['normal', 'active', 'selected']
const PROPERTY_FOR_VARIANT = { normal: 'symbolImageId', active: 'symbolActiveImageId', selected: 'symbolSelectedImageId' }

export const hasSymbolStyle = (properties) => !!(properties?.symbol || properties?.symbolSvgContent)

// The map's own pixelRatio (device pixel ratio × map-size scale factor) — the same source the
// datasets plugin rasterises its OL symbols at, so both draw them 1:1.
export const getPixelRatio = (mapProvider) => mapProvider?.map?.getPixelRatio?.() || 1

/**
 * Resolve one point feature's symbol image and write it back onto the feature.
 * A no-op for points with no symbol config (nothing to render as an icon).
 *
 * @param {Object} params
 * @param {Object} params.manager - OLDrawManager (needs store.source, mapStyle)
 * @param {Object} params.mapProvider
 * @param {import('ol/Feature.js').default} params.olFeature
 * @param {number} [params.pixelRatioOverride] - use this instead of the map's pixelRatio, for
 *   callers (MAP_SET_PIXEL_RATIO) that already have the freshly set value
 * @returns {Promise<void>}
 */
export const resolvePointSymbol = async ({ manager, mapProvider, olFeature, pixelRatioOverride }) => {
  const properties = olFeature.getProperties()
  if (!hasSymbolStyle(properties)) {
    return
  }

  const pixelRatio = pixelRatioOverride ?? getPixelRatio(mapProvider)

  try {
    const results = await Promise.all(
      VARIANTS.map((variant) => symbolRegistry.rasteriseSymbolImage(properties, manager.mapStyle, variant, pixelRatio))
    )
    // All three variants resolve from the same symbol config, so either all succeed or (an
    // unresolvable symbol id) all fail together — gating on 'normal' alone is enough.
    if (!results[0]) {
      return
    }

    // The feature may have been deleted/cancelled while rasterising was in flight.
    if (!manager.store.source.hasFeature(olFeature)) {
      return
    }
    VARIANTS.forEach((variant, i) => {
      const result = results[i]
      if (!result) { return }
      getOrCreateSymbolImage(result.imageId, result.imageData)
      olFeature.set(PROPERTY_FOR_VARIANT[variant], result.imageId)
    })
    // ol/style/Icon draws its source canvas at native pixel size — core/styles.js reads this
    // back to apply `scale: 1 / symbolPixelRatio`, correcting for the canvas being rasterised
    // at pixelRatio device pixels for crispness.
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
 * @param {number} [params.pixelRatioOverride] - see resolvePointSymbol
 * @returns {Promise<void>}
 */
export const refreshAllPointSymbols = ({ manager, mapProvider, pixelRatioOverride }) => {
  const points = manager.store.source.getFeatures().filter(
    (f) => f.getGeometry()?.getType() === 'Point' && hasSymbolStyle(f.getProperties())
  )
  return Promise.all(points.map((olFeature) => resolvePointSymbol({ manager, mapProvider, olFeature, pixelRatioOverride })))
}
